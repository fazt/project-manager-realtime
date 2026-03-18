import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.task import TaskStatus
from app.models.project import MemberRole
from app.schemas.task import StatusCreate, StatusUpdate, StatusResponse, StatusReorder
from app.services.project_service import _require_member, _require_role
from app.sockets.server import sio

router = APIRouter(prefix="/projects/{project_id}/statuses", tags=["statuses"])


@router.get("", response_model=list[StatusResponse])
async def list_statuses(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all statuses for a project."""
    await _require_member(db, project_id, current_user.id)

    result = await db.execute(
        select(TaskStatus)
        .where(TaskStatus.project_id == project_id)
        .order_by(TaskStatus.position)
    )
    return result.scalars().all()


@router.post("", response_model=StatusResponse, status_code=status.HTTP_201_CREATED)
async def create_status(
    project_id: uuid.UUID,
    data: StatusCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a status (admin or editor)."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin, MemberRole.editor])

    status_obj = TaskStatus(
        name=data.name,
        color=data.color,
        position=data.position,
        project_id=project_id,
    )
    db.add(status_obj)
    await db.flush()
    await db.refresh(status_obj)

    await sio.emit(
        "status:created",
        {"project_id": str(project_id), "status_id": str(status_obj.id)},
        room=f"project:{project_id}",
    )

    return status_obj


@router.patch("/{status_id}", response_model=StatusResponse)
async def update_status(
    project_id: uuid.UUID,
    status_id: uuid.UUID,
    data: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a status (admin or editor)."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin, MemberRole.editor])

    result = await db.execute(
        select(TaskStatus).where(
            TaskStatus.id == status_id,
            TaskStatus.project_id == project_id,
        )
    )
    status_obj = result.scalar_one_or_none()
    if not status_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status not found")

    if data.name is not None:
        status_obj.name = data.name
    if data.color is not None:
        status_obj.color = data.color
    if data.position is not None:
        status_obj.position = data.position

    await db.flush()
    await db.refresh(status_obj)

    await sio.emit(
        "status:updated",
        {"project_id": str(project_id), "status_id": str(status_id)},
        room=f"project:{project_id}",
    )

    return status_obj


@router.delete("/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_status(
    project_id: uuid.UUID,
    status_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a status (admin only)."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin])

    result = await db.execute(
        select(TaskStatus).where(
            TaskStatus.id == status_id,
            TaskStatus.project_id == project_id,
        )
    )
    status_obj = result.scalar_one_or_none()
    if not status_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status not found")

    await db.delete(status_obj)
    await db.flush()

    await sio.emit(
        "status:deleted",
        {"project_id": str(project_id), "status_id": str(status_id)},
        room=f"project:{project_id}",
    )


@router.post("/reorder", response_model=list[StatusResponse])
async def reorder_statuses(
    project_id: uuid.UUID,
    data: StatusReorder,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reorder statuses by providing an ordered list of IDs."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin, MemberRole.editor])

    for position, sid in enumerate(data.status_ids):
        result = await db.execute(
            select(TaskStatus).where(
                TaskStatus.id == sid,
                TaskStatus.project_id == project_id,
            )
        )
        status_obj = result.scalar_one_or_none()
        if status_obj:
            status_obj.position = position

    await db.flush()

    result = await db.execute(
        select(TaskStatus)
        .where(TaskStatus.project_id == project_id)
        .order_by(TaskStatus.position)
    )
    statuses = result.scalars().all()

    await sio.emit(
        "status:reordered",
        {"project_id": str(project_id)},
        room=f"project:{project_id}",
    )

    return statuses
