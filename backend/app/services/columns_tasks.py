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
