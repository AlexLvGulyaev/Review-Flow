from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.roles import require_admin
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.entities import EvaluationCase, Review, ReviewResponse
from app.schemas.evaluation import (
    EvaluationCaseCreate,
    EvaluationCaseOut,
    EvaluationScoreUpdate,
)
from app.services.operational_log import log_event
from app.services.review_helpers import latest_response

router = APIRouter(
    prefix="/api/evaluation",
    tags=["evaluation"],
    dependencies=[Depends(require_admin)],
)


def _to_out(case: EvaluationCase) -> EvaluationCaseOut:
    review = case.review
    resp = latest_response(review) if review else None
    prompt = resp.prompt_version if resp else None
    return EvaluationCaseOut(
        id=case.id,
        review_id=case.review_id,
        review_text=review.review_text if review else None,
        draft_response=resp.draft_response if resp else None,
        final_response=resp.final_response if resp else None,
        prompt_key=prompt.prompt_key if prompt else None,
        prompt_version=prompt.version if prompt else None,
        prompt_version_id=resp.prompt_version_id if resp else None,
        expected_quality_notes=case.expected_quality_notes,
        operator_score=case.operator_score,
        operator_comment=case.operator_comment,
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


@router.post("/cases", response_model=EvaluationCaseOut, status_code=201)
def create_evaluation_case(
    payload: EvaluationCaseCreate,
    db: Session = Depends(get_db),
) -> EvaluationCaseOut:
    review = db.get(Review, payload.review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    now = datetime.now(timezone.utc)
    case = EvaluationCase(
        review_id=payload.review_id,
        expected_quality_notes=payload.expected_quality_notes,
        created_at=now,
        updated_at=now,
    )
    db.add(case)
    db.flush()

    log_event(
        db,
        event_type="evaluation_case_created",
        entity_type="evaluation_case",
        entity_id=case.id,
        status="ok",
    )
    db.commit()
    db.refresh(case)
    case = (
        db.query(EvaluationCase)
        .options(
            joinedload(EvaluationCase.review)
            .joinedload(Review.responses)
            .joinedload(ReviewResponse.prompt_version)
        )
        .filter(EvaluationCase.id == case.id)
        .first()
    )
    return _to_out(case)


@router.get("/cases", response_model=list[EvaluationCaseOut])
def list_evaluation_cases(db: Session = Depends(get_db)) -> list[EvaluationCaseOut]:
    cases = (
        db.query(EvaluationCase)
        .options(
            joinedload(EvaluationCase.review)
            .joinedload(Review.responses)
            .joinedload(ReviewResponse.prompt_version),
        )
        .order_by(EvaluationCase.created_at.desc())
        .limit(100)
        .all()
    )
    return [_to_out(c) for c in cases]


@router.patch("/cases/{case_id}", response_model=EvaluationCaseOut)
def score_evaluation_case(
    case_id: UUID,
    payload: EvaluationScoreUpdate,
    db: Session = Depends(get_db),
) -> EvaluationCaseOut:
    case = (
        db.query(EvaluationCase)
        .options(
            joinedload(EvaluationCase.review)
            .joinedload(Review.responses)
            .joinedload(ReviewResponse.prompt_version),
        )
        .filter(EvaluationCase.id == case_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=404, detail="Evaluation case not found")

    case.operator_score = payload.operator_score
    case.operator_comment = payload.operator_comment
    case.updated_at = datetime.now(timezone.utc)

    log_event(
        db,
        event_type="evaluation_scored",
        entity_type="evaluation_case",
        entity_id=case.id,
        status="ok",
    )
    db.commit()
    db.refresh(case)
    return _to_out(case)
