import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import ActivityLog, User
from app.schemas.activity_logs import ActivityLogRead
from app.services.boards import require_board_role

router = APIRouter(tags=["activity"])


@router.get("/boards/{board_id}/activity", response_model=list[ActivityLogRead])
def list_board_activity(
    board_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ActivityLog]:
    require_board_role(db, board_id, current_user, {"owner", "editor", "viewer"})

    return list(
        db.scalars(
            select(ActivityLog)
            .where(ActivityLog.board_id == board_id)
            .order_by(ActivityLog.created_at.desc())
            .limit(limit)
        )
    )
