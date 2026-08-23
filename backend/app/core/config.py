"""
Application settings loaded from environment variables.

Purpose: keep configuration out of code. A secret hardcoded in a source file
ends up in git history forever; an environment variable stays on the machine
(or in Secret Manager in production).
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "DevHub API"
    debug: bool = True

    database_url: str = (
        "postgresql+asyncpg://devhub:devhub@localhost:5433/devhub"
    )

    # Phase 4: Redis for cache, rate limits, and pub/sub.
    # Host port 6380 maps to container 6379 (see docker-compose.yml).
    redis_url: str = "redis://localhost:6380/0"

    # How long a sorted feed stays in Redis before we recompute it.
    feed_cache_ttl_seconds: int = 60

    # Auth rate limit: max attempts per IP inside the window.
    auth_rate_limit: int = 10
    auth_rate_window_seconds: int = 60

    jwt_secret_key: str = "dev-only-change-me-before-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
