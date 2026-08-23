"""
In-process WebSocket registry + Redis subscriber fan-out.

Purpose: keep track of which browsers are connected to *this* instance, and
forward Redis pub/sub messages to the right sockets.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket
from redis.asyncio.client import PubSub

from app.core.pubsub import CHANNEL_PREFIX, CHANNEL_SUFFIX
from app.core.redis import get_redis

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Maps user_id → open WebSockets on this process."""

    def __init__(self) -> None:
        self._connections: dict[UUID, list[WebSocket]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[user_id].append(websocket)

    async def disconnect(self, user_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._connections.get(user_id, [])
            if websocket in sockets:
                sockets.remove(websocket)
            if not sockets and user_id in self._connections:
                del self._connections[user_id]

    async def send_to_user(self, user_id: UUID, payload: dict) -> None:
        async with self._lock:
            sockets = list(self._connections.get(user_id, []))
        dead: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except Exception:
                dead.append(socket)
        for socket in dead:
            await self.disconnect(user_id, socket)


manager = ConnectionManager()

_listener_task: asyncio.Task | None = None


async def _redis_fanout_loop() -> None:
    """
    One long-lived Redis subscription for the whole process.

    Pattern subscribe `user:*:notifications` so we get every user's events,
    then deliver only to sockets connected here.
    """
    redis = get_redis()
    pubsub: PubSub = redis.pubsub()
    pattern = f"{CHANNEL_PREFIX}*{CHANNEL_SUFFIX}"
    await pubsub.psubscribe(pattern)
    logger.info("Redis notification subscriber listening on %s", pattern)

    try:
        async for message in pubsub.listen():
            if message["type"] != "pmessage":
                continue
            channel = message["channel"]
            # channel shape: user:{uuid}:notifications
            try:
                user_id_str = channel.removeprefix(CHANNEL_PREFIX).removesuffix(
                    CHANNEL_SUFFIX
                )
                user_id = UUID(user_id_str)
                payload = json.loads(message["data"])
            except (ValueError, TypeError, json.JSONDecodeError):
                logger.warning("Skipping malformed pubsub message: %s", message)
                continue
            await manager.send_to_user(user_id, payload)
    finally:
        await pubsub.punsubscribe(pattern)
        await pubsub.aclose()


def start_notification_listener() -> None:
    global _listener_task
    if _listener_task is None or _listener_task.done():
        _listener_task = asyncio.create_task(_redis_fanout_loop())


async def stop_notification_listener() -> None:
    global _listener_task
    if _listener_task is not None:
        _listener_task.cancel()
        try:
            await _listener_task
        except asyncio.CancelledError:
            pass
        _listener_task = None
