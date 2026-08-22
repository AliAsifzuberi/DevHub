"""Community schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_serializer

from app.schemas.common import APIModel


class CommunityOut(APIModel):
    id: UUID
    slug: str
    name: str
    description: str
    member_count: int
    created_at: datetime
    accent_color: str
    is_member: bool = False

    @field_serializer("id")
    def ser_id(self, value: UUID) -> str:
        return str(value)

    @field_serializer("created_at")
    def ser_created(self, value: datetime) -> str:
        return value.isoformat()


class CommunityCreate(APIModel):
    slug: str = Field(min_length=2, max_length=40, pattern=r"^[a-z0-9_]+$")
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=1, max_length=2000)
    accent_color: str = Field(default="#4f46e5", pattern=r"^#[0-9a-fA-F]{6}$")
