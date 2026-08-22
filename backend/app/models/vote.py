"""
Votes on posts and comments.

Separate tables (not one polymorphic table) so foreign keys stay real and
deleting a post cascades cleanly to its votes.

value is +1 or -1. Absence of a row means "no vote" (the frontend's 0).
Toggling off a vote deletes the row rather than storing 0 — that keeps the
table small and makes COUNT/SUM aggregates honest.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, SmallInteger, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.comment import Comment
    from app.models.post import Post
    from app.models.user import User


class PostVote(Base):
    __tablename__ = "post_votes"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_post_vote"),
        CheckConstraint("value IN (-1, 1)", name="ck_post_vote_value"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    value: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship()
    post: Mapped[Post] = relationship(back_populates="votes")


class CommentVote(Base):
    __tablename__ = "comment_votes"
    __table_args__ = (
        UniqueConstraint("user_id", "comment_id", name="uq_comment_vote"),
        CheckConstraint("value IN (-1, 1)", name="ck_comment_vote_value"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    comment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=False,
    )
    value: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship()
    comment: Mapped[Comment] = relationship(back_populates="votes")
