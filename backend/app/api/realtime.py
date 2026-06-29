import uuid

import jwt
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.services.boards import require_board_role
from app.services.security import decode_access_token
from app.services.websockets import connection_manager

router = APIRouter(tags=["realtime"])


def get_user_from_websocket_token(token: str | None, db: Session) -> User | None:
    if not token:
        return None

    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(str(payload.get("sub")))
    except (jwt.InvalidTokenError, ValueError, TypeError):
        return None

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        return None

    return user


@router.websocket("/ws/boards/{board_id}")
async def board_websocket(
    websocket: WebSocket,
    board_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    token = websocket.query_params.get("token")
    user = get_user_from_websocket_token(token, db)

    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        require_board_role(db, board_id, user, {"owner", "editor", "viewer"})
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await connection_manager.connect(board_id, websocket)

    await connection_manager.send_json(
        websocket,
        {
            "type": "connection.established",
            "board_id": str(board_id),
            "user_id": str(user.id),
            "connection_count": connection_manager.board_connection_count(board_id),
        },
    )

    await connection_manager.broadcast_to_board(
        board_id,
        {
            "type": "presence.changed",
            "board_id": str(board_id),
            "connection_count": connection_manager.board_connection_count(board_id),
        },
    )

    try:
        while True:
            message = await websocket.receive_json()

            await connection_manager.broadcast_to_board(
                board_id,
                {
                    "type": "client.message",
                    "board_id": str(board_id),
                    "user_id": str(user.id),
                    "payload": message,
                },
            )
    except WebSocketDisconnect:
        connection_manager.disconnect(board_id, websocket)

        await connection_manager.broadcast_to_board(
            board_id,
            {
                "type": "presence.changed",
                "board_id": str(board_id),
                "connection_count": connection_manager.board_connection_count(board_id),
            },
        )
