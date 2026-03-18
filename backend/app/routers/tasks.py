import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, TaskMove,
    AssigneeAdd, TaskLabelAdd,
)
from app.services import task_service
from app.sockets.server import sio

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])


def _task_to_dict(task) -> dict:
    return TaskResponse.model_validate(task).model_dump(mode="json")


async def _emit(event: str, data: dict, room: str):
    await sio.emit(event, data, room=room)


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    project_id: uuid.UUID,
    status_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List tasks in a project, optionally filtered by status."""
    tasks = await task_service.list_tasks(db, project_id, current_user.id, status_id)
    return tasks


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: uuid.UUID,
    data: TaskCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a task."""
    task = await task_service.create_task(db, project_id, data, current_user.id)
    task_data = _task_to_dict(task)
    await db.commit()
    await sio.emit("task:created", task_data, room=f"project:{project_id}")
    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single task."""
    return await task_service.get_task(db, project_id, task_id, current_user.id)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a task."""
    task = await task_service.update_task(db, project_id, task_id, data, current_user.id)
    task_data = _task_to_dict(task)
    background_tasks.add_task(_emit, "task:updated", task_data, f"project:{project_id}")
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a task."""
    status_id = await task_service.delete_task(db, project_id, task_id, current_user.id)
    background_tasks.add_task(
        _emit,
        "task:deleted",
        {"project_id": str(project_id), "task_id": str(task_id), "status_id": str(status_id)},
        f"project:{project_id}",
    )


@router.post("/{task_id}/move", response_model=TaskResponse)
async def move_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    move_data: TaskMove,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Move a task to a different status/position (Kanban drag-and-drop)."""
    task = await task_service.move_task(db, project_id, task_id, move_data, current_user.id)
    task_data = _task_to_dict(task)
    background_tasks.add_task(_emit, "task:moved", task_data, f"project:{project_id}")
    return task


class TaskReorderBody(BaseModel):
    status_id: uuid.UUID
    task_ids: list[uuid.UUID]


@router.post("/reorder", response_model=list[TaskResponse])
async def reorder_tasks(
    project_id: uuid.UUID,
    data: TaskReorderBody,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reorder tasks within a status column by providing an ordered list of task IDs."""
    tasks = await task_service.reorder_tasks(
        db, project_id, data.status_id, data.task_ids, current_user.id
    )
    background_tasks.add_task(
        _emit,
        "task:reordered",
        {"project_id": str(project_id), "status_id": str(data.status_id)},
        f"project:{project_id}",
    )
    return tasks


# --- Assignee endpoints ---

@router.post("/{task_id}/assignees", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def add_assignee(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: AssigneeAdd,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add an assignee to a task."""
    task = await task_service.add_assignee(
        db, project_id, task_id, data.user_id, current_user.id
    )
    task_data = _task_to_dict(task)
    background_tasks.add_task(_emit, "task:updated", task_data, f"project:{project_id}")
    return task


@router.delete("/{task_id}/assignees/{user_id}", response_model=TaskResponse)
async def remove_assignee(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    user_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove an assignee from a task."""
    task = await task_service.remove_assignee(
        db, project_id, task_id, user_id, current_user.id
    )
    task_data = _task_to_dict(task)
    background_tasks.add_task(_emit, "task:updated", task_data, f"project:{project_id}")
    return task


# --- Label endpoints ---

@router.post("/{task_id}/labels", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def add_label(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskLabelAdd,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a label to a task."""
    task = await task_service.add_label(
        db, project_id, task_id, data.label_id, current_user.id
    )
    task_data = _task_to_dict(task)
    background_tasks.add_task(_emit, "task:updated", task_data, f"project:{project_id}")
    return task


@router.delete("/{task_id}/labels/{label_id}", response_model=TaskResponse)
async def remove_label(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    label_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a label from a task."""
    task = await task_service.remove_label(
        db, project_id, task_id, label_id, current_user.id
    )
    task_data = _task_to_dict(task)
    background_tasks.add_task(_emit, "task:updated", task_data, f"project:{project_id}")
    return task
