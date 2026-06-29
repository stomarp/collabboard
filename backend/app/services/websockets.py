import uuid
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, board_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[board_id].add(websocket)

    def disconnect(self, board_id: uuid.UUID, websocket: WebSocket) -> None:
        connections = self.active_connections.get(board_id)

        if connections is None:
            return

        connections.discard(websocket)

        if not connections:
            self.active_connections.pop(board_id, None)

    async def send_json(self, websocket: WebSocket, message: dict[str, Any]) -> None:
        await websocket.send_json(message)

    async def broadcast_to_board(
        self,
        board_id: uuid.UUID,
        message: dict[str, Any],
    ) -> None:
        connections = list(self.active_connections.get(board_id, set()))

        for connection in connections:
            await connection.send_json(message)

    def board_connection_count(self, board_id: uuid.UUID) -> int:
        return len(self.active_connections.get(board_id, set()))


connection_manager = ConnectionManager()
