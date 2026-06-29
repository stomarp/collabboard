import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import Board, BoardMember, User
from app.schemas.boards import BoardCreate, BoardRead, BoardUpdate
from app.services.activity_logs import log_activity
from app.services.boards import (
    get_board_and_membership,
    get_or_create_personal_workspace,
    require_board_role,
)

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("", response_model=list[BoardRead])
def list_boards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Board]:
    return list(
        db.scalars(
            select(Board)
            .join(BoardMember, BoardMember.board_id == Board.id)
            .where(BoardMember.user_id == current_user.id)
            .order_by(Board.created_at.desc())
        )
    )


@router.post("", response_model=BoardRead, status_code=status.HTTP_201_CREATED)
def create_board(
    payload: BoardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Board:
    workspace = get_or_create_personal_workspace(db, current_user)

    board = Board(
        workspace_id=workspace.id,
        name=payload.name,
        description=payload.description,
        created_by_id=current_user.id,
    )
    db.add(board)
    db.flush()

    board_member = BoardMember(
        board_id=board.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(board_member)

    log_activity(
        db,
        board_id=board.id,
        actor_id=current_user.id,
        event_type="board.created",
        entity_type="board",
        entity_id=board.id,
        payload={
            "name": board.name,
            "description": board.description,
            "workspace_id": board.workspace_id,
        },
    )

    db.commit()
    db.refresh(board)
    return board


@router.get("/{board_id}", response_model=BoardRead)
def get_board(
    board_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Board:
    board, _membership = get_board_and_membership(db, board_id, current_user)
    return board


@router.patch("/{board_id}", response_model=BoardRead)
def update_board(
    board_id: uuid.UUID,
    payload: BoardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Board:
    board = require_board_role(db, board_id, current_user, {"owner", "editor"})
    update_data = payload.model_dump(exclude_unset=True)

    previous_values = {
        key: getattr(board, key)
        for key in update_data
    }

    for key, value in update_data.items():
        setattr(board, key, value)

    if update_data:
        log_activity(
            db,
            board_id=board.id,
            actor_id=current_user.id,
            event_type="board.updated",
            entity_type="board",
            entity_id=board.id,
            payload={
                "before": previous_values,
                "after": update_data,
            },
        )

    db.commit()
    db.refresh(board)
    return board


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    board = require_board_role(db, board_id, current_user, {"owner"})
    db.delete(board)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
