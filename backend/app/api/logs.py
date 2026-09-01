"""Журнал «Логи» — проекция по обращениям (канон AIC OperationalLogs).

Чтения журнала не логируются («read-only views intentionally not logged»):
экран сам себя не пишет — в журнале только реальная обработка обращений.
Логируется только действие экспорта (logs_exported — действие над данными,
а не чтение экрана).
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.roles import require_admin_read
from app.db.session import get_db
from app.schemas.logs import (
    ReviewTraceDetail,
    ReviewTraceListResponse,
)
from app.services.logs_service import LogsService
from app.services.operational_log import log_event

router = APIRouter(
    prefix="/api/logs",
    tags=["logs"],
    dependencies=[Depends(require_admin_read)],
)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.get("", response_model=ReviewTraceListResponse)
def list_traces(
    review_id: UUID | None = Query(None),
    status: str | None = Query(None, description="ok / error / pending"),
    request_number: str | None = Query(None, description="Номер или ID обращения"),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> ReviewTraceListResponse:
    """Список обращений с итогами обработки (одна строка = одно обращение)."""
    return LogsService(db).list_traces(
        review_id=review_id,
        status=status,
        request_number=request_number,
        date_from=_parse_dt(date_from),
        date_to=_parse_dt(date_to),
        limit=limit,
        offset=offset,
    )


@router.get("/export")
def export_traces(
    status: str | None = Query(None),
    request_number: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: Session = Depends(get_db),
) -> Response:
    """CSV-выгрузка трейсов обращений; текущие фильтры respected."""
    content = LogsService(db).csv_export(
        status=status,
        request_number=request_number,
        date_from=_parse_dt(date_from),
        date_to=_parse_dt(date_to),
    )
    log_event(db, event_type="logs_exported", status="ok", metadata={"format": "csv"})
    db.commit()
    stamp = datetime.now().strftime("%Y-%m-%d")
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="rf_logs_{stamp}.csv"'},
    )


@router.get("/{review_id}", response_model=ReviewTraceDetail)
def get_trace(review_id: UUID, db: Session = Depends(get_db)) -> ReviewTraceDetail:
    """Развёрнутый трейс обращения: вход → этапы → выход."""
    trace = LogsService(db).get_trace(review_id)
    if not trace:
        raise HTTPException(status_code=404, detail="Trace not found")
    return trace