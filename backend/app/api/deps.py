"""
FastAPI dependencies: database session and current user.

Purpose: inject common requirements into route handlers without repeating
boilerplate. A route declares `db: AsyncSession = Depends(get_db)` and FastAPI
calls get_db for it.
"""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

DbSession = Annotated[AsyncSession, Depends(get_db)]

# auto_error=False so missing credentials become "anonymous" rather than 403
# on public read endpoints.
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    db: DbSession,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> User | None:
    """Return the logged-in user, or None for anonymous requests."""
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if payload is None or "sub" not in payload:
        return None
    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_current_user(
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    """Require authentication — used on write endpoints."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_current_user_optional)]
