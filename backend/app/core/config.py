"""
Application settings loaded from environment variables.

Purpose: keep configuration out of code. A secret hardcoded in a source file
ends up in git history forever; an environment variable stays on the machine
(or in Secret Manager in production).

Dependencies: pydantic-settings, which reads `.env` automatically and validates
types so a missing DATABASE_URL fails at startup instead of at the first query.
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

    # asyncpg driver — SQLAlchemy needs the `postgresql+asyncpg://` scheme.
    database_url: str = (
        "postgresql+asyncpg://devhub:devhub@localhost:5432/devhub"
    )

    # JWT: short-lived access tokens. Phase 3 will add refresh tokens in cookies.
    jwt_secret_key: str = "dev-only-change-me-before-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS: Vite's origin in development. Production will use the real domain.
    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    """Cached so we do not re-read the env file on every request."""
    return Settings()
