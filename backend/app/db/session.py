"""
Async database engine and session factory.

Purpose: one connection pool for the whole process, and a FastAPI dependency
that yields a session per request then closes it.

Why async?
FastAPI can handle many concurrent requests on one thread by awaiting I/O.
A sync database driver would block that thread for every query. asyncpg keeps
the event loop free while Postgres works.

Dependencies: SQLAlchemy 2.0 asyncio + asyncpg.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency: one session per request.

    `expire_on_commit=False` lets us read attributes after commit without a
    lazy-load (which would fail outside an async greenlet). We still close the
    session in `finally` so connections return to the pool.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
