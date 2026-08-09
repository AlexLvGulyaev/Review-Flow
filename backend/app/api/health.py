import time

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.errors import DatabaseUnavailableError
from app.db.session import check_database, get_db
from app.services.operational_log import log_event

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    start = time.perf_counter()
    try:
        db_ok = check_database()
    except Exception as exc:
        raise DatabaseUnavailableError(str(exc)) from exc

    if not db_ok:
        raise DatabaseUnavailableError("Database check failed")

    latency_ms = int((time.perf_counter() - start) * 1000)
    log_event(
        db,
        event_type="deployment_health_checked",
        latency_ms=latency_ms,
        status="ok",
        metadata={"database": "connected"},
    )
    db.commit()

    return {"status": "ok", "database": "connected"}
