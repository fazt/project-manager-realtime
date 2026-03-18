import uuid
from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    type: str
    is_read: bool
    entity_type: str | None
    entity_id: str | None
    project_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
