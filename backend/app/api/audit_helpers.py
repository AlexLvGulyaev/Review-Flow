"""Audit helper for mutation endpoints (pattern: AIC admin `_log_audit`).

Each mutating endpoint calls `audit()` right before its `db.commit()`; the
audit row is persisted in the same transaction as the action itself.
Public (client/demo) endpoints use `audit_client()` — the audit journal is a
journal of user activity as well (владелец: запросы пользователей, проверки
статуса и демо-входы входят в аудит).
"""

from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.roles import Role
from app.services.operational_log import log_audit


def client_ip(request: Request) -> Optional[str]:
    """Real client IP (proxy headers first) — same logic as demo limiter."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client = forwarded.split(",")[0].strip()
        if client:
            return client
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip() or None
    if request.client:
        return request.client.host
    return None


def audit(
    request: Request,
    role: Role,
    action: str,
    *,
    db: Session,
    resource_type: str,
    resource_id: Any = None,
    details: dict[str, Any] | None = None,
) -> None:
    log_audit(
        db,
        user_role=role.value,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        ip_address=client_ip(request),
        details=details,
    )


def audit_client(
    request: Request,
    action: str,
    *,
    db: Session,
    resource_type: str,
    role: str = "client",
    resource_id: Any = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Audit entry for public contour activity (client / demo), IP-tracked."""
    log_audit(
        db,
        user_role=role,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        ip_address=client_ip(request),
        details=details,
    )