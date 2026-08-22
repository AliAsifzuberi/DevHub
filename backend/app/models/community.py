"""
Communities and membership.

A community is a named discussion group (like a subreddit). Membership is a
many-to-many join table: one user can join many communities, one community
has many members.

member_count is denormalised — updated when someone joins/leaves — so listing
communities does not require COUNT(*) on every request.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.post import Post
    from app.models.user import User


class Community(Base):
    __tablename__ = "communities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(
        String(40), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    member_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accent_color: Mapped[str] = mapped_column(String(7), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    posts: Mapped[list[Post]] = relationship(back_populates="community")
    memberships: Mapped[list[CommunityMembership]] = relationship(
        back_populates="community", cascade="all, delete-orphan"
    )


class CommunityMembership(Base):
    """
    Join table: which users belong to which communities.

    UniqueConstraint stops the same user joining the same community twice —
    the database enforces it even if application code has a bug.
    """

    __tablename__ = "community_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "community_id", name="uq_membership"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship()
    community: Mapped[Community] = relationship(back_populates="memberships")
