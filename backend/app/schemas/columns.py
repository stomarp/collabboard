import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ColumnCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ColumnUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)


class ColumnRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    board_id: uuid.UUID
    name: str
    position: int
    created_at: datetime
    updated_at: datetime
