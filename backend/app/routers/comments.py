import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.comment import TaskComment
from app.models.task import Task
from app.models.project import MemberRole
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from app.services.project_service import _require_member, _require_role
from app.sockets.server import sio

router = APIRouter(prefix="/projects/{project_id}/tasks/{task_id}/comments", tags=["comments"])


async def _get_task_in_project(
    db: AsyncSession, project_id: uuid.UUID, task_id: uuid.UUID
) -> Task:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.get("", response_model=list[CommentResponse])
async def list_comments(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all comments for a task."""
    await _require_member(db, project_id, current_user.id)
    await _get_task_in_project(db, project_id, task_id)

    result = await db.execute(
        select(TaskComment)
        .options(selectinload(TaskComment.author))
        .where(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a comment to a task (any project member)."""
    await _require_member(db, project_id, current_user.id)
    await _get_task_in_project(db, project_id, task_id)

    comment = TaskComment(
        content=data.content,
        task_id=task_id,
        author_id=current_user.id,
    )
    db.add(comment)
    await db.flush()

    result = await db.execute(
        select(TaskComment)
        .options(selectinload(TaskComment.author))
        .where(TaskComment.id == comment.id)
    )
    comment = result.scalar_one()

    await sio.emit(
        "comment:created",
        {
            "project_id": str(project_id),
            "task_id": str(task_id),
            "comment_id": str(comment.id),
        },
        room=f"project:{project_id}",
    )

    return comment


@router.patch("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    comment_id: uuid.UUID,
    data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a comment (author only)."""
    await _require_member(db, project_id, current_user.id)

    result = await db.execute(
        select(TaskComment)
        .options(selectinload(TaskComment.author))
        .where(TaskComment.id == comment_id, TaskComment.task_id == task_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own comments",
        )

    comment.content = data.content
    await db.flush()
    await db.refresh(comment)

    await sio.emit(
        "comment:updated",
        {
            "project_id": str(project_id),
            "task_id": str(task_id),
            "comment_id": str(comment_id),
        },
        room=f"project:{project_id}",
    )

    return comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a comment (author or admin)."""
    member = await _require_member(db, project_id, current_user.id)

    result = await db.execute(
        select(TaskComment).where(
            TaskComment.id == comment_id,
            TaskComment.task_id == task_id,
        )
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.author_id != current_user.id and member.role != MemberRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments",
        )

    await db.delete(comment)
    await db.flush()

    await sio.emit(
        "comment:deleted",
        {
            "project_id": str(project_id),
            "task_id": str(task_id),
            "comment_id": str(comment_id),
        },
        room=f"project:{project_id}",
    )
