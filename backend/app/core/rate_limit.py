"""
Redis-backed rate limiting.

Purpose: stop credential stuffing / spam on auth endpoints.

How it works
  INCR a key like `ratelimit:login:127.0.0.1`. On the first increment, set an
  expiry (the window). If the count exceeds the limit inside that window,
  reject with HTTP 429.

Why Redis and not a Python dict?
  A dict lives in one process's memory. On Cloud Run you have many instances —
  an attacker could spray 10 requests at each instance and never hit a local
  limit. Redis is shared, so the counter is global.
"""

from fastapi import HTTPException, Request, status

from app.core.config import get_settings
from app.core.redis import get_redis


def client_ip(request: Request) -> str:
    """
    Best-effort client IP.

    Behind a reverse proxy you would read X-Forwarded-For; locally
    request.client.host is enough for learning.
    """
    if request.client is None:
        return "unknown"
    return request.client.host


async def enforce_rate_limit(
    *,
    bucket: str,
    identity: str,
    limit: int | None = None,
    window_seconds: int | None = None,
) -> None:
    settings = get_settings()
    limit = limit if limit is not None else settings.auth_rate_limit
    window = (
        window_seconds
        if window_seconds is not None
        else settings.auth_rate_window_seconds
    )

    redis = get_redis()
    key = f"ratelimit:{bucket}:{identity}"
    count = await redis.incr(key)
    if count == 1:
        # First hit in this window — start the TTL clock.
        await redis.expire(key, window)

    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Too many attempts. Try again in about {window} seconds."
            ),
            headers={"Retry-After": str(window)},
        )
