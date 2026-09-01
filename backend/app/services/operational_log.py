import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.entities import AuditLog, OperationalLog


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


def log_audit(
    db: Session,
    *,
    user_role: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    ip_address: str | None = None,
    user_id: str | None = None,
    user_name: str | None = None,
    details: dict[str, Any] | None = None,
    request: Any = None,
) -> None:
    """Record an auditable human action in the audit journal.

    Called from mutation endpoints; the caller's db.commit() persists the row
    together with the action itself. `ip_address` is filled from the (FastAPI)
    request when not passed explicitly. The request is duck-typed to keep this
    service importable outside of FastAPI (tests, scripts).
    """
    if request is not None and ip_address is None and request.client:
        ip_address = request.client.host

    db.add(
        AuditLog(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            details=details or {},
            created_at=datetime.now(timezone.utc),
        )
    )
