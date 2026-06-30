import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import Comment, User
from app.schemas.comments import CommentCreate, CommentRead
from app.services.activity_logs import log_activity
from app.services.comments import (
    create_task_comment,
    ensure_comment_can_be_deleted,
    get_comment_for_user,
    list_task_comments,
)
from app.services.realtime_events import (
    publish_realtime_board_event,
    serialize_comment,
)

router = APIRouter(tags=["comments"])


@router.get("/tasks/{task_id}/comments", response_model=list[CommentRead])
def list_comments(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Comment]:
    _task, comments = list_task_comments(db, task_id, current_user)
    return comments


@router.post(
    "/tasks/{task_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    task_id: uuid.UUID,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Comment:
    task, comment = create_task_comment(
        db,
        task_id,
        current_user,
        payload.body.strip(),
    )

    log_activity(
        db,
        board_id=task.board_id,
        actor_id=current_user.id,
        event_type="comment.created",
        entity_type="comment",
        entity_id=comment.id,
        payload={
            "task_id": task.id,
            "task_title": task.title,
            "body_preview": comment.body[:160],
        },
    )

    db.commit()
    db.refresh(comment)

    await publish_realtime_board_event(
        task.board_id,
        {
            "type": "comment.created",
            "board_id": str(task.board_id),
            "actor_id": str(current_user.id),
            "task_id": str(task.id),
            "comment": serialize_comment(comment),
        },
    )

    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    task, comment = get_comment_for_user(db, comment_id, current_user)
    ensure_comment_can_be_deleted(db, task, comment, current_user)

    comment_payload = serialize_comment(comment)

    log_activity(
        db,
        board_id=task.board_id,
        actor_id=current_user.id,
        event_type="comment.deleted",
        entity_type="comment",
        entity_id=comment.id,
        payload={
            "task_id": task.id,
            "task_title": task.title,
            "body_preview": comment.body[:160],
        },
    )

    db.delete(comment)
    db.commit()

    await publish_realtime_board_event(
        task.board_id,
        {
            "type": "comment.deleted",
            "board_id": str(task.board_id),
            "actor_id": str(current_user.id),
            "task_id": str(task.id),
            "comment": comment_payload,
        },
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
