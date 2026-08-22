"""Auth routes: register, login, current user."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.api.serializers import user_to_public
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.user import TokenResponse, UserLogin, UserPublic, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, db: DbSession) -> TokenResponse:
    """
    Create an account and return a JWT immediately.

    Client validation is duplicated here on purpose — the browser can be
    bypassed with curl, so the server is the real authority.
    """
    existing = await db.execute(
        select(User).where(
            (User.username == body.username) | (User.email == body.email)
        )
    )
    if existing.scalar_one_or_none() is not None:
        # Vague on purpose: do not reveal whether username or email collided.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email is already taken.",
        )

    user = User(
        username=body.username,
        display_name=body.display_name or body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        karma=1,
    )
    db.add(user)
    await db.flush()  # assign user.id before building the token

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_public(user))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: DbSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    # Same message for "no user" and "wrong password" — prevents account
    # enumeration (attackers building lists of valid usernames).
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
        )

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_public(user))


@router.get("/me", response_model=UserPublic)
async def me(user: CurrentUser) -> UserPublic:
    return user_to_public(user)
