import uuid
from datetime import datetime, date
from enum import Enum

from sqlalchemy import (
    String, Text, DateTime, Date, ForeignKey, func,
    Enum as SAEnum, Integer, Table, Column, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


# Many-to-many association table for Task <-> TaskLabel
task_label_association = Table(
    "task_label_association",
    Base.metadata,
    Column(
        "task_id",
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "label_id",
        ForeignKey("task_labels.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class TaskStatus(Base):
    __tablename__ = "task_statuses"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1", nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="statuses")
    tasks: Mapped[list["Task"]] = relationship(
        "Task", back_populates="status", order_by="Task.position"
    )


class TaskLabel(Base):
    __tablename__ = "task_labels"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1", nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="labels")
    tasks: Mapped[list["Task"]] = relationship(
        "Task", secondary=task_label_association, back_populates="labels"
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[TaskPriority] = mapped_column(
        SAEnum(TaskPriority), default=TaskPriority.medium, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("task_statuses.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    status: Mapped["TaskStatus | None"] = relationship("TaskStatus", back_populates="tasks")
    creator: Mapped["User | None"] = relationship(
        "User", back_populates="created_tasks", foreign_keys=[created_by]
    )
    labels: Mapped[list["TaskLabel"]] = relationship(
        "TaskLabel", secondary=task_label_association, back_populates="tasks"
    )
    assignments: Mapped[list["TaskAssignment"]] = relationship(
        "TaskAssignment", back_populates="task", cascade="all, delete-orphan"
    )
    comments: Mapped[list["TaskComment"]] = relationship(
        "TaskComment", back_populates="task", cascade="all, delete-orphan",
        order_by="TaskComment.created_at"
    )


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    __table_args__ = (
        UniqueConstraint("task_id", "user_id", name="uq_task_assignment"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="assignments")
    user: Mapped["User"] = relationship("User", back_populates="task_assignments")
