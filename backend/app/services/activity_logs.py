import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models import ActivityLog


def make_json_safe(value: Any) -> Any:
    if isinstance(value, uuid.UUID):
        return str(value)

    if isinstance(value, datetime | date):
        return value.isoformat()

    if isinstance(value, dict):
        return {str(key): make_json_safe(item) for key, item in value.items()}

    if isinstance(value, list):
        return [make_json_safe(item) for item in value]

    return value


def log_activity(
    db: Session,
    *,
    board_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    event_type: str,
    entity_type: str,
    entity_id: uuid.UUID | None,
    payload: dict[str, Any] | None = None,
) -> ActivityLog:
    activity = ActivityLog(
        board_id=board_id,
        actor_id=actor_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=make_json_safe(payload or {}),
    )
    db.add(activity)
    return activity
