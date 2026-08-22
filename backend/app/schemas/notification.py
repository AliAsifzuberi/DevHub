"""Notification schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import field_serializer

from app.schemas.common import APIModel

NotificationType = Literal["comment", "reply", "vote"]


class NotificationOut(APIModel):
    id: UUID
    type: NotificationType
    message: str
    link: str
    is_read: bool
    created_at: datetime

    @field_serializer("id")
    def ser_id(self, value: UUID) -> str:
        return str(value)

    @field_serializer("created_at")
    def ser_created(self, value: datetime) -> str:
        return value.isoformat()
