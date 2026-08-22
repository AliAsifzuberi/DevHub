"""Post schemas — match frontend Post interface."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_serializer

from app.schemas.common import APIModel
from app.schemas.community import CommunityOut
from app.schemas.user import UserPublic

FeedSort = Literal["hot", "new", "top"]
VoteValue = Literal[-1, 0, 1]


class PostOut(APIModel):
    id: UUID
    title: str
    body: str
    author: UserPublic
    community: CommunityOut
    created_at: datetime
    score: int
    comment_count: int
    viewer_vote: VoteValue = 0

    @field_serializer("id")
    def ser_id(self, value: UUID) -> str:
        return str(value)

    @field_serializer("created_at")
    def ser_created(self, value: datetime) -> str:
        return value.isoformat()


class PostCreate(APIModel):
    title: str = Field(min_length=5, max_length=300)
    body: str = Field(default="", max_length=40_000)
    community_slug: str


class VoteRequest(APIModel):
    """Frontend sends 1 or -1; 0 is never sent (toggle is server-side)."""

    value: Literal[-1, 1]
