from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.roles import require_admin
from app.db.session import get_db
from app.schemas.reports import BusinessProblemsReport, ChQualityReport, CustomerReviewsReport
from app.services.operational_log import log_event
from app.services.report_export import EXPORT_HANDLERS, MEDIA_TYPES, export_filename
from app.services.reports import ReportsService

router = APIRouter(
    prefix="/api/admin/reports",
    tags=["admin-reports"],
    dependencies=[Depends(require_admin)],
)

REPORT_BUILDERS = {
    "customer-reviews": lambda svc, p, df, dt: svc.customer_reviews(p, df, dt),
    "business-problems": lambda svc, p, df, dt: svc.business_problems(p, df, dt),
    "ch-quality": lambda svc, p, df, dt: svc.ch_quality(p, df, dt),
}


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.get("/customer-reviews", response_model=CustomerReviewsReport)
def report_customer_reviews(
    period: str = Query("30", description="today | 7 | 30 | 90 | custom"),
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
) -> CustomerReviewsReport:
    log_event(db, event_type="report_customer_reviews_requested", status="ok", metadata={"period": period})
    db.commit()
    return ReportsService(db).customer_reviews(period, _parse_dt(date_from), _parse_dt(date_to))


@router.get("/business-problems", response_model=BusinessProblemsReport)
def report_business_problems(
    period: str = Query("30"),
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
) -> BusinessProblemsReport:
    log_event(db, event_type="report_business_problems_requested", status="ok", metadata={"period": period})
    db.commit()
    return ReportsService(db).business_problems(period, _parse_dt(date_from), _parse_dt(date_to))


@router.get("/ch-quality", response_model=ChQualityReport)
def report_ch_quality(
    period: str = Query("30"),
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
) -> ChQualityReport:
    log_event(db, event_type="report_ch_quality_requested", status="ok", metadata={"period": period})
    db.commit()
    return ReportsService(db).ch_quality(period, _parse_dt(date_from), _parse_dt(date_to))


@router.get("/{report_key}/export")
def export_report(
    report_key: str,
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    period: str = Query("30"),
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
) -> Response:
    if report_key not in EXPORT_HANDLERS:
        raise HTTPException(status_code=404, detail="Unknown report")
    svc = ReportsService(db)
    report = REPORT_BUILDERS[report_key](svc, period, _parse_dt(date_from), _parse_dt(date_to))
    try:
        content = EXPORT_HANDLERS[report_key][format](report)
    except RuntimeError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc

    filename = export_filename(report_key, period, format)
    log_event(
        db,
        event_type="report_exported",
        status="ok",
        metadata={"report": report_key, "period": period, "format": format},
    )
    db.commit()
    return Response(
        content=content,
        media_type=MEDIA_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
