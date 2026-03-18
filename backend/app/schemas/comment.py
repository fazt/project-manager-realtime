import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import UserResponse


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    id: uuid.UUID
    content: str
    task_id: uuid.UUID
    author_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    author: UserResponse

    model_config = {"from_attributes": True}
