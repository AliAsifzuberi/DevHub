"""User request/response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_serializer

from app.schemas.common import APIModel


class UserPublic(APIModel):
    """What other users (and the frontend User type) are allowed to see."""

    id: UUID
    username: str
    display_name: str
    avatar_url: str | None
    bio: str | None
    created_at: datetime
    karma: int

    @field_serializer("id")
    def ser_id(self, value: UUID) -> str:
        return str(value)

    @field_serializer("created_at")
    def ser_created(self, value: datetime) -> str:
        return value.isoformat()


class UserRegister(APIModel):
    username: str = Field(min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")
    display_name: str | None = Field(default=None, max_length=80)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(APIModel):
    username: str
    password: str


class TokenResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
