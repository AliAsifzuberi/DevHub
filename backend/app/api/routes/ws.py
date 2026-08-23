"""
WebSocket endpoint for live notifications.

  WS /api/ws/notifications?token=<JWT>

Browsers cannot set Authorization headers on the WebSocket handshake the way
Axios does for HTTP, so the access token travels as a query parameter. That
is a common trade-off; keep the token short-lived and never log the full URL.
"""

from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, WebSocketException

from app.core.security import decode_access_token
from app.core.ws_manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/notifications")
async def notifications_socket(
    websocket: WebSocket,
    token: str = Query(...),
) -> None:
    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise WebSocketException(code=1008)

    try:
        user_id = UUID(payload["sub"])
    except (ValueError, TypeError):
        raise WebSocketException(code=1008)

    await manager.connect(user_id, websocket)
    try:
        # Client messages are ignored; this loop just keeps the connection
        # open until the browser disconnects or the server shuts down.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user_id, websocket)
