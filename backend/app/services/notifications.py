"""
Create a notification row and publish it over Redis Pub/Sub.

Purpose: one place that both persists the notification (so GET /notifications
still works after refresh) and pushes it live to whichever API instance holds
the recipient's WebSocket.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.serializers import notification_to_out
from app.core.pubsub import publish_notification
from app.models.notification import Notification


async def notify_user(
    db: AsyncSession,
    *,
    user_id: UUID,
    type: str,
    message: str,
    link: str,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        message=message,
        link=link,
        is_read=False,
    )
    db.add(notification)
    await db.flush()
    # server_default created_at is only visible after refresh.
    await db.refresh(notification)

    payload = notification_to_out(notification).model_dump(
        mode="json", by_alias=True
    )
    await publish_notification(user_id, payload)
    return notification
