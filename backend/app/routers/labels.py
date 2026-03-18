import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.task import TaskLabel
from app.models.project import MemberRole
from app.schemas.task import LabelCreate, LabelUpdate, LabelResponse
from app.services.project_service import _require_member, _require_role
from app.sockets.server import sio

router = APIRouter(prefix="/projects/{project_id}/labels", tags=["labels"])


@router.get("", response_model=list[LabelResponse])
async def list_labels(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all labels for a project."""
    await _require_member(db, project_id, current_user.id)

    result = await db.execute(
        select(TaskLabel).where(TaskLabel.project_id == project_id)
    )
    return result.scalars().all()


@router.post("", response_model=LabelResponse, status_code=status.HTTP_201_CREATED)
async def create_label(
    project_id: uuid.UUID,
    data: LabelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a label (admin or editor)."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin, MemberRole.editor])

    label = TaskLabel(name=data.name, color=data.color, project_id=project_id)
    db.add(label)
    await db.flush()
    await db.refresh(label)

    await sio.emit(
        "label:created",
        {"project_id": str(project_id), "label_id": str(label.id)},
        room=f"project:{project_id}",
    )

    return label


@router.patch("/{label_id}", response_model=LabelResponse)
async def update_label(
    project_id: uuid.UUID,
    label_id: uuid.UUID,
    data: LabelUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a label (admin or editor)."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin, MemberRole.editor])

    result = await db.execute(
        select(TaskLabel).where(
            TaskLabel.id == label_id,
            TaskLabel.project_id == project_id,
        )
    )
    label = result.scalar_one_or_none()
    if not label:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")

    if data.name is not None:
        label.name = data.name
    if data.color is not None:
        label.color = data.color

    await db.flush()
    await db.refresh(label)

    await sio.emit(
        "label:updated",
        {"project_id": str(project_id), "label_id": str(label_id)},
        room=f"project:{project_id}",
    )

    return label


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_label(
    project_id: uuid.UUID,
    label_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a label (admin only)."""
    await _require_role(db, project_id, current_user.id, [MemberRole.admin])

    result = await db.execute(
        select(TaskLabel).where(
            TaskLabel.id == label_id,
            TaskLabel.project_id == project_id,
        )
    )
    label = result.scalar_one_or_none()
    if not label:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")

    await db.delete(label)
    await db.flush()

    await sio.emit(
        "label:deleted",
        {"project_id": str(project_id), "label_id": str(label_id)},
        room=f"project:{project_id}",
    )
