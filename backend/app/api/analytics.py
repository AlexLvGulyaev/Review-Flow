from fastapi import APIRouter, Depends

from app.core.roles import require_admin
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analytics import AnalyticsOverview
from app.services.analytics import AnalyticsService
from app.services.operational_log import log_event

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    dependencies=[Depends(require_admin)],
)


@router.get("/overview", response_model=AnalyticsOverview)
def analytics_overview(db: Session = Depends(get_db)) -> AnalyticsOverview:
    log_event(db, event_type="analytics_overview_requested", status="ok")
    db.commit()
    return AnalyticsService(db).get_overview()
