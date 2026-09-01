from fastapi import APIRouter, Depends

from app.core.roles import require_admin_read
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analytics import AnalyticsOverview
from app.services.analytics import AnalyticsService

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    dependencies=[Depends(require_admin_read)],
)


@router.get("/overview", response_model=AnalyticsOverview)
def analytics_overview(db: Session = Depends(get_db)) -> AnalyticsOverview:
    return AnalyticsService(db).get_overview()
