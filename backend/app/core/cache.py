"""
Feed caching helpers.

Purpose: avoid re-sorting every post on every homepage load.

What we cache
  The *shared* feed JSON for a sort order (`hot` / `new` / `top`) — fields that
  look the same for every viewer (title, score, author, …).

What we never cache in that key
  `viewerVote` and `isMember`. Those depend on who is asking. Caching Maya's
  `viewerVote: 1` and serving it to Devon would be a data leak and a wrong UI.

Pattern:
  1. GET feed:hot → if miss, query Postgres, sort, store shared JSON for 60s
  2. Overlay the current viewer's votes/memberships from Postgres
  3. On write (create post, vote, comment) → DELETE feed:* so the next reader
     recomputes

Redis is a cache, not the source of truth. If it dies, we just hit Postgres
and rebuild. If Postgres dies, the product is down either way.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.config import get_settings
from app.core.redis import get_redis

FEED_KEY_PREFIX = "feed:"


def feed_cache_key(sort: str) -> str:
    return f"{FEED_KEY_PREFIX}{sort}"


async def get_cached_feed(sort: str) -> list[dict[str, Any]] | None:
    redis = get_redis()
    raw = await redis.get(feed_cache_key(sort))
    if raw is None:
        return None
    return json.loads(raw)


async def set_cached_feed(sort: str, posts: list[dict[str, Any]]) -> None:
    redis = get_redis()
    ttl = get_settings().feed_cache_ttl_seconds
    await redis.set(feed_cache_key(sort), json.dumps(posts), ex=ttl)


async def invalidate_feed_cache() -> None:
    """
    Drop every sorted feed.

    Called after writes that change what the homepage should show. Blunt on
    purpose: three keys is cheaper than trying to surgically patch one post
    inside a cached list, and feed writes are rare compared to reads.
    """
    redis = get_redis()
    keys = [feed_cache_key(sort) for sort in ("hot", "new", "top")]
    await redis.delete(*keys)
