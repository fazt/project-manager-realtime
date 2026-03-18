import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember, MemberRole
from app.schemas.project import MemberAdd, MemberUpdate, MemberResponse
from app.services.project_service import _require_role, _require_member, get_member
from app.sockets.server import sio

router = APIRouter(prefix="/projects/{project_id}/members", tags=["members"])


async def _get_project_or_404(db: AsyncSession, project_id: uuid.UUID) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("", response_model=list[MemberResponse])
async def list_members(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all members of a project."""
    await _require_member(db, project_id, current_user.id)

    result = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(ProjectMember.project_id == project_id)
    )
    return result.scalars().all()


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def add_member(
    project_id: uuid.UUID,
    data: MemberAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to a project (admin only)."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin])

    # Resolve user by user_id, email, or username
    target_user = None
    if data.user_id:
        result = await db.execute(select(User).where(User.id == data.user_id))
        target_user = result.scalar_one_or_none()
    elif data.email:
        result = await db.execute(select(User).where(User.email == data.email))
        target_user = result.scalar_one_or_none()
    elif data.username:
        result = await db.execute(select(User).where(User.username == data.username))
        target_user = result.scalar_one_or_none()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide user_id, email, or username",
        )

    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Check if already a member
    existing = await get_member(db, project_id, target_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project",
        )

    member = ProjectMember(
        project_id=project_id,
        user_id=target_user.id,
        role=data.role,
    )
    db.add(member)
    await db.flush()

    result = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(ProjectMember.id == member.id)
    )
    member = result.scalar_one()

    await sio.emit(
        "member:added",
        {"project_id": str(project_id), "user_id": str(target_user.id)},
        room=f"project:{project_id}",
    )

    return member


@router.patch("/{user_id}", response_model=MemberResponse)
async def update_member_role(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    data: MemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a member's role (admin only)."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin])

    result = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    member.role = data.role
    await db.flush()
    await db.refresh(member)

    await sio.emit(
        "member:updated",
        {"project_id": str(project_id), "user_id": str(user_id)},
        room=f"project:{project_id}",
    )

    return member


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a project (admin only, cannot remove owner)."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin])

    project = await _get_project_or_404(db, project_id)
    if project.owner_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the project owner",
        )

    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    await db.delete(member)
    await db.flush()

    await sio.emit(
        "member:removed",
        {"project_id": str(project_id), "user_id": str(user_id)},
        room=f"project:{project_id}",
    )
