import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.entities import OperationalLog


def log_event(
    db: Session,
    *,
    event_type: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    prompt_version_id: uuid.UUID | None = None,
    model_name: str | None = None,
    latency_ms: int | None = None,
    status: str = "ok",
    error_message: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    db.add(
        OperationalLog(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            prompt_version_id=prompt_version_id,
            model_name=model_name,
            latency_ms=latency_ms,
            status=status,
            error_message=error_message,
            metadata_=metadata or {},
            created_at=datetime.now(timezone.utc),
        )
    )
