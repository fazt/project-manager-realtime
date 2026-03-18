import uuid
from datetime import datetime, date

from pydantic import BaseModel, Field

from app.models.task import TaskPriority
from app.schemas.auth import UserResponse


# --- Status Schemas ---

class StatusCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    position: int = Field(default=0, ge=0)


class StatusUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    position: int | None = Field(default=None, ge=0)


class StatusResponse(BaseModel):
    id: uuid.UUID
    name: str
    color: str
    position: int
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StatusReorder(BaseModel):
    # List of status ids in the new order
    status_ids: list[uuid.UUID]


# --- Label Schemas ---

class LabelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class LabelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class LabelResponse(BaseModel):
    id: uuid.UUID
    name: str
    color: str
    project_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Task Schemas ---

class AssigneeAdd(BaseModel):
    user_id: uuid.UUID


class TaskLabelAdd(BaseModel):
    label_id: uuid.UUID


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    priority: TaskPriority = TaskPriority.medium
    status_id: uuid.UUID | None = None
    due_date: date | None = None
    assignee_ids: list[uuid.UUID] = Field(default_factory=list)
    label_ids: list[uuid.UUID] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    priority: TaskPriority | None = None
    status_id: uuid.UUID | None = None
    due_date: date | None = None


class TaskMove(BaseModel):
    status_id: uuid.UUID
    position: int = Field(..., ge=0)


class TaskAssignmentResponse(BaseModel):
    id: uuid.UUID
    user: UserResponse
    assigned_at: datetime

    model_config = {"from_attributes": True}


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    priority: TaskPriority
    position: int
    due_date: date | None
    project_id: uuid.UUID
    status_id: uuid.UUID | None
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    labels: list[LabelResponse] = []
    assignments: list[TaskAssignmentResponse] = []

    model_config = {"from_attributes": True}
