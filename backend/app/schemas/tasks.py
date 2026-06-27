import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    column_id: uuid.UUID
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    priority: str = Field(default="medium", max_length=32)
    assignee_id: uuid.UUID | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    priority: str | None = Field(default=None, max_length=32)
    assignee_id: uuid.UUID | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    board_id: uuid.UUID
    column_id: uuid.UUID
    title: str
    description: str | None
    position: int
    priority: str
    assignee_id: uuid.UUID | None
    created_by_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
