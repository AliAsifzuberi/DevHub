"""
Redis Pub/Sub for live notifications.

Purpose: fan out "new notification" events to every API instance.

The Cloud Run problem
  User A comments on User B's post. That request hits instance 1. User B's
  browser holds a WebSocket to instance 2. Instance 1 cannot push to B's
  socket directly — it does not have it.

  So instance 1 PUBLISHes to Redis channel `user:{B's id}:notifications`.
  Every instance SUBSCRIBEs (via a pattern). Instance 2 receives the message
  and writes it down B's WebSocket.

Locally you only have one instance, so the bug never shows — which is why we
build pub/sub *before* we scale, not after.
"""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from app.core.redis import get_redis

CHANNEL_PREFIX = "user:"
CHANNEL_SUFFIX = ":notifications"


def user_notification_channel(user_id: UUID | str) -> str:
    return f"{CHANNEL_PREFIX}{user_id}{CHANNEL_SUFFIX}"


async def publish_notification(
    user_id: UUID,
    payload: dict[str, Any],
) -> None:
    redis = get_redis()
    channel = user_notification_channel(user_id)
    await redis.publish(channel, json.dumps(payload))
