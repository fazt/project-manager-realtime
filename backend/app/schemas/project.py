import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.project import MemberRole
from app.schemas.auth import UserResponse


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    color: str
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MemberAdd(BaseModel):
    user_id: uuid.UUID | None = None
    email: str | None = None
    username: str | None = None
    role: MemberRole = MemberRole.viewer


class MemberUpdate(BaseModel):
    role: MemberRole


class MemberResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: MemberRole
    joined_at: datetime
    user: UserResponse

    model_config = {"from_attributes": True}
