"""
Posts — top-level discussion units.

score and comment_count are denormalised aggregates. They are updated in the
same transaction as a vote or comment insert. Computing them with COUNT on
every feed request would dominate query cost once the tables grow.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.comment import Comment
    from app.models.community import Community
    from app.models.user import User
    from app.models.vote import PostVote


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
    )
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    author: Mapped[User] = relationship(back_populates="posts")
    community: Mapped[Community] = relationship(back_populates="posts")
    comments: Mapped[list[Comment]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )
    votes: Mapped[list[PostVote]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )
