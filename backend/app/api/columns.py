import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import BoardColumn, User
from app.schemas.columns import ColumnCreate, ColumnRead, ColumnUpdate
from app.services.activity_logs import log_activity
from app.services.boards import require_board_role
from app.services.realtime_events import (
    publish_realtime_board_event,
    serialize_column,
    serialize_dict,
)
from app.services.columns_tasks import (
    EDITOR_ROLES,
    VIEWER_ROLES,
    get_column_for_user,
    get_next_column_position,
)

router = APIRouter(tags=["columns"])


@router.get("/boards/{board_id}/columns", response_model=list[ColumnRead])
def list_columns(
    board_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BoardColumn]:
    require_board_role(db, board_id, current_user, VIEWER_ROLES)
    return list(
        db.scalars(
            select(BoardColumn)
            .where(BoardColumn.board_id == board_id)
            .order_by(BoardColumn.position.asc())
        )
    )


@router.post(
    "/boards/{board_id}/columns",
    response_model=ColumnRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_column(
    board_id: uuid.UUID,
    payload: ColumnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BoardColumn:
    require_board_role(db, board_id, current_user, EDITOR_ROLES)

    column = BoardColumn(
        board_id=board_id,
        name=payload.name,
        position=get_next_column_position(db, board_id),
    )
    db.add(column)
    db.flush()

    log_activity(
        db,
        board_id=board_id,
        actor_id=current_user.id,
        event_type="column.created",
        entity_type="column",
        entity_id=column.id,
        payload={
            "name": column.name,
            "position": column.position,
        },
    )

    db.commit()
    db.refresh(column)

    await publish_realtime_board_event(
        board_id,
        {
            "type": "column.created",
            "board_id": str(board_id),
            "actor_id": str(current_user.id),
            "column": serialize_column(column),
        },
    )

    return column


@router.patch("/columns/{column_id}", response_model=ColumnRead)
async def update_column(
    column_id: uuid.UUID,
    payload: ColumnUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BoardColumn:
    column = get_column_for_user(db, column_id, current_user, EDITOR_ROLES)
    update_data = payload.model_dump(exclude_unset=True)

    previous_values = {
        key: getattr(column, key)
        for key in update_data
    }

    for key, value in update_data.items():
        setattr(column, key, value)

    if update_data:
        log_activity(
            db,
            board_id=column.board_id,
            actor_id=current_user.id,
            event_type="column.updated",
            entity_type="column",
            entity_id=column.id,
            payload={
                "before": previous_values,
                "after": update_data,
            },
        )

    db.commit()
    db.refresh(column)

    if update_data:
        await publish_realtime_board_event(
            column.board_id,
            {
                "type": "column.updated",
                "board_id": str(column.board_id),
                "actor_id": str(current_user.id),
                "column": serialize_column(column),
                "before": serialize_dict(previous_values),
                "after": serialize_dict(update_data),
            },
        )

    return column


@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_column(
    column_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    column = get_column_for_user(db, column_id, current_user, EDITOR_ROLES)

    log_activity(
        db,
        board_id=column.board_id,
        actor_id=current_user.id,
        event_type="column.deleted",
        entity_type="column",
        entity_id=column.id,
        payload={
            "name": column.name,
            "position": column.position,
        },
    )

    board_id = column.board_id
    column_payload = serialize_column(column)

    db.delete(column)
    db.commit()

    await publish_realtime_board_event(
        board_id,
        {
            "type": "column.deleted",
            "board_id": str(board_id),
            "actor_id": str(current_user.id),
            "column": column_payload,
        },
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
