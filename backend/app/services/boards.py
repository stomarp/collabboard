import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Board, BoardMember, User, Workspace, WorkspaceMember


def get_or_create_personal_workspace(db: Session, user: User) -> Workspace:
    slug = f"personal-{user.id}"
    workspace = db.scalar(select(Workspace).where(Workspace.slug == slug))

    if workspace is not None:
        return workspace

    workspace = Workspace(
        name=f"{user.full_name or user.email} Workspace",
        slug=slug,
        description="Personal workspace created automatically for board management.",
        created_by_id=user.id,
    )
    db.add(workspace)
    db.flush()

    membership = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role="owner",
    )
    db.add(membership)
    db.flush()

    return workspace


def get_board_and_membership(db: Session, board_id: uuid.UUID, user: User) -> tuple[Board, BoardMember]:
    membership = db.scalar(
        select(BoardMember).where(
            BoardMember.board_id == board_id,
            BoardMember.user_id == user.id,
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    board = db.get(Board, board_id)
    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    return board, membership


def require_board_role(
    db: Session,
    board_id: uuid.UUID,
    user: User,
    allowed_roles: set[str],
) -> Board:
    board, membership = get_board_and_membership(db, board_id, user)

    if membership.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action",
        )

    return board
