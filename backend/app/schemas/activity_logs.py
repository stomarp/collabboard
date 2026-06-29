import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ActivityLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    board_id: uuid.UUID
    actor_id: uuid.UUID | None
    event_type: str
    entity_type: str
    entity_id: uuid.UUID | None
    payload: dict[str, Any]
    created_at: datetime
