from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class LogEntry(BaseModel):
    timestamp: datetime
    event_type: str
    review_id: UUID | None
    message: str | None
    latency_ms: int | None
    metadata: dict[str, Any]
