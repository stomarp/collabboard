import uuid
from datetime import datetime
from typing import Any

from app.models import BoardColumn, Comment, Task
from app.services.redis_pubsub import publish_board_event
from app.services.websockets import connection_manager


def serialize_value(value: Any) -> Any:
    if isinstance(value, uuid.UUID):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    return value


def serialize_dict(data: dict[str, Any]) -> dict[str, Any]:
    return {
        key: serialize_value(value)
        for key, value in data.items()
    }


def serialize_column(column: BoardColumn) -> dict[str, Any]:
    return {
        "id": str(column.id),
        "board_id": str(column.board_id),
        "name": column.name,
        "position": column.position,
        "created_at": column.created_at.isoformat(),
        "updated_at": column.updated_at.isoformat(),
    }


def serialize_task(task: Task) -> dict[str, Any]:
    return {
        "id": str(task.id),
        "board_id": str(task.board_id),
        "column_id": str(task.column_id),
        "title": task.title,
        "description": task.description,
        "position": task.position,
        "priority": task.priority,
        "assignee_id": str(task.assignee_id) if task.assignee_id else None,
        "created_by_id": str(task.created_by_id) if task.created_by_id else None,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }


def serialize_comment(comment: Comment) -> dict[str, Any]:
    return {
        "id": str(comment.id),
        "task_id": str(comment.task_id),
        "user_id": str(comment.user_id) if comment.user_id else None,
        "body": comment.body,
        "created_at": comment.created_at.isoformat(),
        "updated_at": comment.updated_at.isoformat(),
    }


async def publish_realtime_board_event(
    board_id: uuid.UUID,
    message: dict[str, Any],
) -> None:
    published = await publish_board_event(board_id, message)

    if not published:
        await connection_manager.broadcast_to_board(board_id, message)
