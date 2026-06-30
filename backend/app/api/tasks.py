import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import Task, User
from app.schemas.tasks import TaskCreate, TaskRead, TaskUpdate
from app.services.activity_logs import log_activity
from app.services.boards import require_board_role
from app.services.realtime_events import (
    publish_realtime_board_event,
    serialize_dict,
    serialize_task,
)
from app.services.columns_tasks import (
    EDITOR_ROLES,
    VIEWER_ROLES,
    get_board_column_or_404,
    get_next_task_position,
    get_task_for_user,
    validate_assignee_is_board_member,
)

router = APIRouter(tags=["tasks"])


@router.get("/boards/{board_id}/tasks", response_model=list[TaskRead])
def list_tasks(
    board_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Task]:
    require_board_role(db, board_id, current_user, VIEWER_ROLES)
    return list(
        db.scalars(
            select(Task)
            .where(Task.board_id == board_id)
            .order_by(Task.column_id.asc(), Task.position.asc())
        )
    )


@router.post(
    "/boards/{board_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    board_id: uuid.UUID,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    require_board_role(db, board_id, current_user, EDITOR_ROLES)
    column = get_board_column_or_404(db, board_id, payload.column_id)
    validate_assignee_is_board_member(db, board_id, payload.assignee_id)

    task = Task(
        board_id=board_id,
        column_id=column.id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        assignee_id=payload.assignee_id,
        created_by_id=current_user.id,
        position=get_next_task_position(db, column.id),
    )
    db.add(task)
    db.flush()

    log_activity(
        db,
        board_id=board_id,
        actor_id=current_user.id,
        event_type="task.created",
        entity_type="task",
        entity_id=task.id,
        payload={
            "title": task.title,
            "description": task.description,
            "priority": task.priority,
            "column_id": task.column_id,
            "position": task.position,
            "assignee_id": task.assignee_id,
        },
    )

    db.commit()
    db.refresh(task)

    await publish_realtime_board_event(
        board_id,
        {
            "type": "task.created",
            "board_id": str(board_id),
            "actor_id": str(current_user.id),
            "task": serialize_task(task),
        },
    )

    return task


@router.get("/tasks/{task_id}", response_model=TaskRead)
def get_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    return get_task_for_user(db, task_id, current_user, VIEWER_ROLES)


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    task = get_task_for_user(db, task_id, current_user, EDITOR_ROLES)
    update_data = payload.model_dump(exclude_unset=True)

    if "assignee_id" in update_data:
        validate_assignee_is_board_member(db, task.board_id, update_data["assignee_id"])

    previous_values = {
        key: getattr(task, key)
        for key in update_data
    }

    for key, value in update_data.items():
        setattr(task, key, value)

    if update_data:
        log_activity(
            db,
            board_id=task.board_id,
            actor_id=current_user.id,
            event_type="task.updated",
            entity_type="task",
            entity_id=task.id,
            payload={
                "before": previous_values,
                "after": update_data,
            },
        )

    db.commit()
    db.refresh(task)

    if update_data:
        await publish_realtime_board_event(
            task.board_id,
            {
                "type": "task.updated",
                "board_id": str(task.board_id),
                "actor_id": str(current_user.id),
                "task": serialize_task(task),
                "before": serialize_dict(previous_values),
                "after": serialize_dict(update_data),
            },
        )

    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    task = get_task_for_user(db, task_id, current_user, EDITOR_ROLES)

    log_activity(
        db,
        board_id=task.board_id,
        actor_id=current_user.id,
        event_type="task.deleted",
        entity_type="task",
        entity_id=task.id,
        payload={
            "title": task.title,
            "column_id": task.column_id,
            "position": task.position,
            "priority": task.priority,
        },
    )

    board_id = task.board_id
    task_payload = serialize_task(task)

    db.delete(task)
    db.commit()

    await publish_realtime_board_event(
        board_id,
        {
            "type": "task.deleted",
            "board_id": str(board_id),
            "actor_id": str(current_user.id),
            "task": task_payload,
        },
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
