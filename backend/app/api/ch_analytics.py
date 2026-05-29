from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.roles import require_admin
from app.db.session import get_db
from app.schemas.ch_analytics import ChAnalyticsDashboard, ChAuditTrail
from app.services.ch_analytics import ChAnalyticsService
from app.services.operational_log import log_event

router = APIRouter(
    prefix="/api/admin/ch-analytics",
    tags=["admin-ch-analytics"],
    dependencies=[Depends(require_admin)],
)


@router.get("/dashboard", response_model=ChAnalyticsDashboard)
def ch_analytics_dashboard(
    days: int = Query(30, ge=1, le=365),
    product_area_id: UUID | None = None,
    topic_id: UUID | None = None,
    case_quality_limit: int = Query(50, ge=1, le=200),
    misses_limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> ChAnalyticsDashboard:
    log_event(db, event_type="ch_analytics_dashboard_requested", status="ok")
    db.commit()
    return ChAnalyticsService(db).get_dashboard(
        days=days,
        product_area_id=product_area_id,
        topic_id=topic_id,
        case_quality_limit=case_quality_limit,
        misses_limit=misses_limit,
    )


@router.get("/audit", response_model=ChAuditTrail)
def ch_analytics_audit(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> ChAuditTrail:
    return ChAnalyticsService(db).get_audit(days=days, limit=limit)
