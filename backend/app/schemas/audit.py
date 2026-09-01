from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AuditEntry(BaseModel):
    id: UUID
    seq_number: int
    timestamp: datetime
    user_id: str | None
    user_name: str | None
    user_role: str
    action: str
    resource_type: str
    resource_id: str | None
    ip_address: str | None
    details: dict[str, Any]


class AuditListResponse(BaseModel):
    items: list[AuditEntry]
    total: int
    limit: int
    offset: int