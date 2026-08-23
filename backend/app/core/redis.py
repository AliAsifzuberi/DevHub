"""
Shared Redis connection for the whole process.

Purpose: one async Redis client used for caching, rate limiting, and pub/sub.

Why a module-level client instead of opening a connection per request?
Creating a TCP connection to Redis on every request would waste time and file
descriptors. A shared client with a connection pool is the normal pattern —
same idea as the SQLAlchemy engine.

Lifecycle: `init_redis` / `close_redis` are called from the FastAPI lifespan
in main.py so we connect at startup and disconnect cleanly on shutdown.
"""

from redis.asyncio import Redis

from app.core.config import get_settings

_redis: Redis | None = None


async def init_redis() -> Redis:
    global _redis
    settings = get_settings()
    _redis = Redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )
    # Fail fast if Redis is down — better than discovering it on the first
    # cached request with a cryptic timeout.
    await _redis.ping()
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


def get_redis() -> Redis:
    if _redis is None:
        raise RuntimeError(
            "Redis is not initialised. Did lifespan call init_redis()?"
        )
    return _redis
