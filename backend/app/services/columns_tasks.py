import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import BoardColumn, BoardMember, Task, User
from app.services.boards import require_board_role

EDITOR_ROLES = {"owner", "editor"}
VIEWER_ROLES = {"owner", "editor", "viewer"}


def get_next_column_position(db: Session, board_id: uuid.UUID) -> int:
    max_position = db.scalar(
        select(func.max(BoardColumn.position)).where(BoardColumn.board_id == board_id)
    )
    return 0 if max_position is None else max_position + 1


def get_next_task_position(db: Session, column_id: uuid.UUID) -> int:
    max_position = db.scalar(select(func.max(Task.position)).where(Task.column_id == column_id))
    return 0 if max_position is None else max_position + 1


def get_column_for_user(
    db: Session,
    column_id: uuid.UUID,
    user: User,
    allowed_roles: set[str],
) -> BoardColumn:
    column = db.get(BoardColumn, column_id)
    if column is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")

    require_board_role(db, column.board_id, user, allowed_roles)
    return column


def get_task_for_user(
    db: Session,
    task_id: uuid.UUID,
    user: User,
    allowed_roles: set[str],
) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    require_board_role(db, task.board_id, user, allowed_roles)
    return task


def get_board_column_or_404(db: Session, board_id: uuid.UUID, column_id: uuid.UUID) -> BoardColumn:
    column = db.scalar(
        select(BoardColumn).where(
            BoardColumn.id == column_id,
            BoardColumn.board_id == board_id,
        )
    )
    if column is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found for this board",
        )
    return column


def validate_assignee_is_board_member(
    db: Session,
    board_id: uuid.UUID,
    assignee_id: uuid.UUID | None,
) -> None:
    if assignee_id is None:
        return

    membership = db.scalar(
        select(BoardMember).where(
            BoardMember.board_id == board_id,
            BoardMember.user_id == assignee_id,
        )
    )
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee must be a member of the board",
        )


def list_column_tasks(db: Session, column_id: uuid.UUID) -> list[Task]:
    return list(
        db.scalars(
            select(Task)
            .where(Task.column_id == column_id)
            .order_by(Task.position.asc(), Task.created_at.asc())
        )
    )


def unique_tasks(tasks: list[Task]) -> list[Task]:
    seen_task_ids: set[uuid.UUID] = set()
    unique_task_list: list[Task] = []

    for task in tasks:
        if task.id in seen_task_ids:
            continue

        seen_task_ids.add(task.id)
        unique_task_list.append(task)

    return unique_task_list


def move_tasks_to_temporary_positions(db: Session, tasks: list[Task]) -> None:
    for index, task in enumerate(tasks):
        task.position = -(index + 1)

    db.flush()


def move_task_to_position(
    db: Session,
    task: Task,
    target_column_id: uuid.UUID,
    target_position: int,
) -> list[Task]:
    target_column = get_board_column_or_404(db, task.board_id, target_column_id)
    source_column_id = task.column_id

    source_tasks = list_column_tasks(db, source_column_id)
    source_without_task = [
        current_task
        for current_task in source_tasks
        if current_task.id != task.id
    ]

    if source_column_id == target_column.id:
        next_tasks = source_without_task
        normalized_position = min(max(target_position, 0), len(next_tasks))
        next_tasks.insert(normalized_position, task)

        affected_tasks = unique_tasks(next_tasks)
        move_tasks_to_temporary_positions(db, affected_tasks)

        for position, current_task in enumerate(next_tasks):
            current_task.column_id = source_column_id
            current_task.position = position

        db.flush()
        return affected_tasks

    target_tasks = list_column_tasks(db, target_column.id)
    target_without_task = [
        current_task
        for current_task in target_tasks
        if current_task.id != task.id
    ]

    normalized_position = min(max(target_position, 0), len(target_without_task))
    target_without_task.insert(normalized_position, task)

    affected_tasks = unique_tasks(source_without_task + target_without_task)
    move_tasks_to_temporary_positions(db, affected_tasks)

    for position, current_task in enumerate(source_without_task):
        current_task.column_id = source_column_id
        current_task.position = position

    for position, current_task in enumerate(target_without_task):
        current_task.column_id = target_column.id
        current_task.position = position

    db.flush()
    return affected_tasks
