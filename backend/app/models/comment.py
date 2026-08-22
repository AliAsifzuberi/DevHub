"""
Comments — threaded discussion via a self-referencing foreign key.

parent_id is NULL for a top-level comment. Otherwise it points at another
row in this same table. That one nullable column is the entire tree structure.

The API nests rows into Comment.replies[]; the frontend renders them with a
recursive component. We do not store the tree as nested JSON — relational
form keeps queries, voting, and moderation straightforward.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.post import Post
    from app.models.user import User
    from app.models.vote import CommentVote


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    author: Mapped[User] = relationship(back_populates="comments")
    post: Mapped[Post] = relationship(back_populates="comments")
    parent: Mapped[Comment | None] = relationship(
        remote_side="Comment.id", back_populates="replies"
    )
    replies: Mapped[list[Comment]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
    votes: Mapped[list[CommentVote]] = relationship(
        back_populates="comment", cascade="all, delete-orphan"
    )
