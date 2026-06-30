import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Comment, Task, User
from app.services.boards import require_board_role
from app.services.columns_tasks import EDITOR_ROLES, VIEWER_ROLES, get_task_for_user


def list_task_comments(
    db: Session,
    task_id: uuid.UUID,
    user: User,
) -> tuple[Task, list[Comment]]:
    task = get_task_for_user(db, task_id, user, VIEWER_ROLES)

    comments = list(
        db.scalars(
            select(Comment)
            .where(Comment.task_id == task.id)
            .order_by(Comment.created_at.asc())
        )
    )

    return task, comments


def create_task_comment(
    db: Session,
    task_id: uuid.UUID,
    user: User,
    body: str,
) -> tuple[Task, Comment]:
    task = get_task_for_user(db, task_id, user, EDITOR_ROLES)

    comment = Comment(
        task_id=task.id,
        user_id=user.id,
        body=body,
    )

    db.add(comment)
    db.flush()

    return task, comment


def get_comment_for_user(
    db: Session,
    comment_id: uuid.UUID,
    user: User,
) -> tuple[Task, Comment]:
    comment = db.get(Comment, comment_id)

    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )

    task = db.get(Task, comment.task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    require_board_role(db, task.board_id, user, EDITOR_ROLES)

    return task, comment


def ensure_comment_can_be_deleted(
    db: Session,
    task: Task,
    comment: Comment,
    user: User,
) -> None:
    if comment.user_id == user.id:
        return

    require_board_role(db, task.board_id, user, {"owner"})
