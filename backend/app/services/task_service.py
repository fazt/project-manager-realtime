import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.task import Task, TaskStatus, TaskLabel, TaskAssignment, task_label_association
from app.models.project import ProjectMember, MemberRole
from app.schemas.task import TaskCreate, TaskUpdate, TaskMove


async def _require_project_member(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ProjectMember:
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project",
        )
    return member


async def _require_editor_or_admin(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ProjectMember:
    member = await _require_project_member(db, project_id, user_id)
    if member.role == MemberRole.viewer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot modify tasks",
        )
    return member


async def _get_task_or_404(db: AsyncSession, task_id: uuid.UUID) -> Task:
    result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.labels),
            selectinload(Task.assignments).selectinload(TaskAssignment.user),
        )
        .where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


async def list_tasks(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    status_id: uuid.UUID | None = None,
) -> list[Task]:
    """List tasks in a project, optionally filtered by status."""
    await _require_project_member(db, project_id, user_id)

    query = (
        select(Task)
        .options(
            selectinload(Task.labels),
            selectinload(Task.assignments).selectinload(TaskAssignment.user),
        )
        .where(Task.project_id == project_id)
        .order_by(Task.status_id, Task.position)
    )
    if status_id:
        query = query.where(Task.status_id == status_id)

    result = await db.execute(query)
    return list(result.scalars().all())


async def create_task(
    db: AsyncSession,
    project_id: uuid.UUID,
    data: TaskCreate,
    user_id: uuid.UUID,
) -> Task:
    """Create a task in a project."""
    await _require_editor_or_admin(db, project_id, user_id)

    # Compute next position in the given status column
    count_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id == project_id,
            Task.status_id == data.status_id,
        )
    )
    position = count_result.scalar() or 0

    task = Task(
        title=data.title,
        description=data.description,
        priority=data.priority,
        status_id=data.status_id,
        due_date=data.due_date,
        project_id=project_id,
        created_by=user_id,
        position=position,
    )
    db.add(task)
    await db.flush()

    # Add assignees
    for assignee_id in data.assignee_ids:
        assignment = TaskAssignment(task_id=task.id, user_id=assignee_id)
        db.add(assignment)

    # Add labels
    if data.label_ids:
        label_result = await db.execute(
            select(TaskLabel).where(
                TaskLabel.id.in_(data.label_ids),
                TaskLabel.project_id == project_id,
            )
        )
        labels = label_result.scalars().all()
        task.labels = list(labels)

    await db.flush()
    return await _get_task_or_404(db, task.id)


async def get_task(
    db: AsyncSession,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Task:
    """Get a single task."""
    await _require_project_member(db, project_id, user_id)
    task = await _get_task_or_404(db, task_id)
    if task.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


async def update_task(
    db: AsyncSession,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskUpdate,
    user_id: uuid.UUID,
) -> Task:
    """Update a task."""
    await _require_editor_or_admin(db, project_id, user_id)
    task = await _get_task_or_404(db, task_id)
    if task.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.priority is not None:
        task.priority = data.priority
    if data.status_id is not None:
        task.status_id = data.status_id
    if data.due_date is not None:
        task.due_date = data.due_date

    await db.flush()
    return await _get_task_or_404(db, task.id)


async def delete_task(
    db: AsyncSession,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    user_id: uuid.UUID,
) -> uuid.UUID:
    """Delete a task. Returns the status_id for socket notification."""
    await _require_editor_or_admin(db, project_id, user_id)
    task = await _get_task_or_404(db, task_id)
    if task.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    status_id = task.status_id
    await db.delete(task)
    await db.flush()
    return status_id


async def move_task(
    db: AsyncSession,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    move_data: TaskMove,
    user_id: uuid.UUID,
) -> Task:
    """Move a task to a different status and/or position (Kanban drag)."""
    await _require_editor_or_admin(db, project_id, user_id)
    task = await _get_task_or_404(db, task_id)
    if task.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    old_status_id = task.status_id
    new_status_id = move_data.status_id
    new_position = move_data.position

    # If moving to a different column, shift tasks in the old column
    if old_status_id != new_status_id:
        # Close the gap in old column
        await _shift_tasks_after_remove(db, project_id, old_status_id, task.position)

    # Make room in the new column
    await _shift_tasks_for_insert(db, project_id, new_status_id, new_position, exclude_id=task_id)

    task.status_id = new_status_id
    task.position = new_position
    await db.flush()
    return await _get_task_or_404(db, task.id)


async def reorder_tasks(
    db: AsyncSession,
    project_id: uuid.UUID,
    status_id: uuid.UUID,
    task_ids: list[uuid.UUID],
    user_id: uuid.UUID,
) -> list[Task]:
    """Reorder tasks within a status column."""
    await _require_editor_or_admin(db, project_id, user_id)

    for position, task_id in enumerate(task_ids):
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.project_id == project_id)
        )
        task = result.scalar_one_or_none()
        if task:
            task.position = position
            task.status_id = status_id

    await db.flush()
    return await list_tasks(db, project_id, user_id, status_id=status_id)


async def add_assignee(
    db: AsyncSession,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    assignee_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Task:
    """Add an assignee to a task."""
    await _require_editor_or_admin(db, project_id, user_id)
    task = await _get_task_or_404(db, task_id)
    if task.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Check if already assigned
    existing = await db.execute(
        select(TaskAssignment).where(
            TaskAssignment.task_id == task_id,
            TaskAssignment.user_id == assignee_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already assigned to this task",
        )

    assignment = TaskAssignment(task_id=task_id, user_id=assignee_id)
    db.add(assignment)
    await db.flush()
    return await _get_task_or_404(db, task_id)


async def remove_assignee(
    db: AsyncSession,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    assignee_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Task:
    """Remove an assignee from a task."""
    await _require_editor_or_admin(db, project_id, user_id)
    task = await _get_task_or_404(db, task_id)
    if task.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    result = await db.execute(
        select(TaskAssignment).where(
            TaskAssignment.task_id == task_id,
            TaskAssignment.user_id == assignee_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    await db.delete(assignment)
    await db.flush()
    return await _get_task_or_404(db, task_id)


async def add_label(
    db: AsyncSession,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    label_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Task:
    """Add a label to a task."""
    await _require_editor_or_admin(db, project_id, user_id)
    task = await _get_task_or_404(db, task_id)
    if task.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    label_result = await db.execute(
        select(TaskLabel).where(
            TaskLabel.id == label_id,
            TaskLabel.project_id == project_id,
        )
    )
    label = label_result.scalar_one_or_none()
    if not label:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")

    if label not in task.labels:
        task.labels.append(label)
        await db.flush()

    return await _get_task_or_404(db, task_id)


async def remove_label(
    db: AsyncSession,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    label_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Task:
    """Remove a label from a task."""
    await _require_editor_or_admin(db, project_id, user_id)
    task = await _get_task_or_404(db, task_id)
    if task.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.labels = [lbl for lbl in task.labels if lbl.id != label_id]
    await db.flush()
    return await _get_task_or_404(db, task_id)


# --- Internal helpers ---

async def _shift_tasks_after_remove(
    db: AsyncSession,
    project_id: uuid.UUID,
    status_id: uuid.UUID | None,
    removed_position: int,
) -> None:
    """Shift positions down for tasks after the removed position."""
    result = await db.execute(
        select(Task).where(
            Task.project_id == project_id,
            Task.status_id == status_id,
            Task.position > removed_position,
        )
    )
    for task in result.scalars().all():
        task.position -= 1


async def _shift_tasks_for_insert(
    db: AsyncSession,
    project_id: uuid.UUID,
    status_id: uuid.UUID,
    insert_position: int,
    exclude_id: uuid.UUID,
) -> None:
    """Shift positions up for tasks at or after insert_position."""
    result = await db.execute(
        select(Task).where(
            Task.project_id == project_id,
            Task.status_id == status_id,
            Task.position >= insert_position,
            Task.id != exclude_id,
        )
    )
    for task in result.scalars().all():
        task.position += 1
