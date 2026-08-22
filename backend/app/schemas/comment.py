"""Comment schemas — nested replies match frontend Comment interface."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_serializer

from app.schemas.common import APIModel
from app.schemas.user import UserPublic

VoteValue = Literal[-1, 0, 1]


class CommentOut(APIModel):
    id: UUID
    post_id: UUID
    parent_id: UUID | None
    author: UserPublic
    body: str
    created_at: datetime
    score: int
    viewer_vote: VoteValue = 0
    replies: list[CommentOut] = Field(default_factory=list)

    @field_serializer("id", "post_id")
    def ser_ids(self, value: UUID) -> str:
        return str(value)

    @field_serializer("parent_id")
    def ser_parent(self, value: UUID | None) -> str | None:
        return str(value) if value else None

    @field_serializer("created_at")
    def ser_created(self, value: datetime) -> str:
        return value.isoformat()


class CommentCreate(APIModel):
    body: str = Field(min_length=1, max_length=10_000)
    parent_id: UUID | None = None
