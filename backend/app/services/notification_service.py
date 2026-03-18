import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.notification import Notification


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    message: str,
    type: str = "info",
    entity_type: str | None = None,
    entity_id: str | None = None,
    project_id: uuid.UUID | None = None,
) -> Notification:
    """Create a new notification for a user."""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        entity_type=entity_type,
        entity_id=entity_id,
        project_id=project_id,
    )
    db.add(notification)
    await db.flush()
    await db.refresh(notification)
    return notification


async def list_user_notifications(
    db: AsyncSession,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
) -> list[Notification]:
    """List notifications for a user."""
    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712
    query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def mark_notification_read(
    db: AsyncSession,
    notification_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Notification | None:
    """Mark a single notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notification = result.scalar_one_or_none()
    if notification:
        notification.is_read = True
        await db.flush()
        await db.refresh(notification)
    return notification


async def mark_all_notifications_read(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    """Mark all notifications for a user as read. Returns count updated."""
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    return result.rowcount
