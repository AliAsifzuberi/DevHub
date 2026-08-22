"""Notification list for the current user."""

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.api.serializers import notification_to_out
from app.models.notification import Notification
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    db: DbSession, user: CurrentUser
) -> list[NotificationOut]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return [notification_to_out(n) for n in result.scalars().all()]
