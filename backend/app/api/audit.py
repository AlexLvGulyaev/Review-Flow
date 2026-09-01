from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.roles import require_admin_read
from app.db.session import get_db
from app.schemas.audit import AuditEntry, AuditListResponse
from app.services.audit_service import AuditService

router = APIRouter(
    prefix="/api/audit",
    tags=["audit"],
    dependencies=[Depends(require_admin_read)],
)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.get("", response_model=AuditListResponse)
def list_audit(
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    user_role: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> AuditListResponse:
    return AuditService(db).list_audit(
        action=action,
        resource_type=resource_type,
        user_role=user_role,
        date_from=_parse_dt(date_from),
        date_to=_parse_dt(date_to),
        limit=limit,
        offset=offset,
    )


@router.get("/export")
def export_audit(
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    user_role: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: Session = Depends(get_db),
) -> Response:
    """CSV export of the audit journal; current filters are respected."""
    content = AuditService(db).csv_export(
        action=action,
        resource_type=resource_type,
        user_role=user_role,
        date_from=_parse_dt(date_from),
        date_to=_parse_dt(date_to),
    )
    stamp = datetime.now().strftime("%Y-%m-%d")
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="rf_audit_{stamp}.csv"'},
    )


@router.get("/{entry_id}", response_model=AuditEntry)
def get_audit_entry(entry_id: UUID, db: Session = Depends(get_db)) -> AuditEntry:
    entry = AuditService(db).get_entry(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Audit entry not found")
    return entry