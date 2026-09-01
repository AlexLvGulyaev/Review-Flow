from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.audit_helpers import audit
from app.core.roles import Role, require_admin, require_admin_read
from app.db.session import get_db
from app.schemas.ch_runtime_settings import ChRuntimeSettingsOut, ChRuntimeSettingsPatch
from app.services.ch_runtime_settings import ChRuntimeSettingsService
from app.services.operational_log import log_event

router = APIRouter(
    prefix="/api/settings/ch-runtime",
    tags=["ch-runtime-settings"],
    dependencies=[Depends(require_admin_read)],
)


def _to_out(row) -> ChRuntimeSettingsOut:
    return ChRuntimeSettingsOut(
        retrieval_top_n=int(row.retrieval_top_n),
        minimum_match_score=float(row.minimum_match_score),
        confidence_medium_delta=float(row.confidence_medium_delta),
        default_confidence_threshold=float(row.default_confidence_threshold),
        draft_on_medium=bool(row.draft_on_medium),
        auto_decision_on_high=bool(row.auto_decision_on_high),
        confidence_score_floor=float(row.confidence_score_floor),
        confidence_gap_high=float(row.confidence_gap_high),
        updated_at=row.updated_at,
    )


@router.get("", response_model=ChRuntimeSettingsOut)
def get_ch_runtime_settings(db: Session = Depends(get_db)) -> ChRuntimeSettingsOut:
    return _to_out(ChRuntimeSettingsService(db).get_row())


@router.patch("", response_model=ChRuntimeSettingsOut, dependencies=[Depends(require_admin)])
def patch_ch_runtime_settings(
    body: ChRuntimeSettingsPatch,
    request: Request,
    role: Role = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ChRuntimeSettingsOut:
    audit(request, role, "ch_runtime_settings_updated", resource_type="ch_runtime_settings", db=db, details=body.model_dump(exclude_unset=True))
    svc = ChRuntimeSettingsService(db)
    row = svc.update(body.model_dump(exclude_unset=True))
    log_event(
        db,
        event_type="ch_runtime_settings_updated",
        status="ok",
        metadata=body.model_dump(exclude_unset=True),
    )
    db.commit()
    db.refresh(row)
    return _to_out(row)
