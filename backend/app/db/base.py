"""
SQLAlchemy declarative base and shared mixins.

Purpose: every model inherits from Base so Alembic can discover tables and
so we share common columns (id, created_at) without copy-paste.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Root of the ORM hierarchy. Alembic looks here for metadata."""


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class UUIDPrimaryKeyMixin:
    """
    UUID primary keys instead of serial integers.

    Why: sequential IDs leak how many rows you have (`/posts/1042`), and they
    make client-side or multi-region ID generation hard. UUIDs are opaque and
    unique without a central counter.
    """

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
