from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.roles import require_admin
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.logs import LogEntry
from app.services.logs_service import LogsService
from app.services.operational_log import log_event

router = APIRouter(
    prefix="/api/logs",
    tags=["logs"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[LogEntry])
def list_logs(
    event_type: str | None = Query(None),
    review_id: UUID | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[LogEntry]:
    log_event(
        db,
        event_type="logs_view_opened",
        status="ok",
        metadata={"event_type_filter": event_type, "review_id": str(review_id) if review_id else None},
    )
    db.commit()
    return LogsService(db).list_logs(
        event_type=event_type,
        review_id=review_id,
        limit=limit,
    )
