from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ch_entities import CaseMatchResult, ResponseCase, ResponseCaseCandidate
from app.models.entities import Review
from app.models.ch_entities import ResponseCaseDecision
from app.services.operational_log import log_event

CANDIDATE_TYPE_NEW_RESPONSE_CASE = "new_response_case"
CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE = "response_case_example"


def _resolve_match_score(
    db: Session,
    review_id: uuid.UUID,
    case_id: uuid.UUID,
    decision: ResponseCaseDecision,
) -> float | None:
    if decision.match_confidence is not None:
        return float(decision.match_confidence)
    row = db.scalar(
        select(CaseMatchResult)
        .where(
            CaseMatchResult.review_id == review_id,
            CaseMatchResult.response_case_id == case_id,
        )
        .order_by(CaseMatchResult.rank.asc())
        .limit(1)
    )
    return float(row.match_score) if row else None


def maybe_create_example_learning_candidate(
    db: Session,
    review: Review,
    decision: ResponseCaseDecision,
    *,
    operator_id: str = "operator-ui",
) -> ResponseCaseCandidate | None:
    """Create response_case_example candidate when operator confirmed below-threshold match."""
    case = db.get(ResponseCase, decision.response_case_id)
    if not case:
        return None

    match_score = _resolve_match_score(db, review.id, case.id, decision)
    if match_score is None:
        return None

    retrieval_threshold = float(case.confidence_threshold)
    if match_score >= retrieval_threshold:
        return None

    existing = db.scalar(
        select(ResponseCaseCandidate).where(
            ResponseCaseCandidate.review_id == review.id,
            ResponseCaseCandidate.target_response_case_id == case.id,
            ResponseCaseCandidate.candidate_type == CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE,
        )
    )
    if existing:
        return None

    gap = retrieval_threshold - match_score
    now = datetime.now(timezone.utc)
    payload = {
        "review_id": str(review.id),
        "response_case_id": str(case.id),
        "case_code": case.case_code,
        "case_title": case.title,
        "review_text": review.review_text,
        "match_score": match_score,
        "retrieval_threshold": retrieval_threshold,
        "gap": gap,
        "operator_id": operator_id,
        "created_at": now.isoformat(),
    }

    candidate = ResponseCaseCandidate(
        review_id=review.id,
        status="pending_admin",
        candidate_type=CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE,
        target_response_case_id=case.id,
        proposed_title=f"Пример для ТС: {case.title}",
        proposed_description=json.dumps(payload, ensure_ascii=False, indent=2),
        proposed_by_operator_id=operator_id,
        created_at=now,
        updated_at=now,
    )
    db.add(candidate)
    db.flush()

    log_event(
        db,
        event_type="example_learning_candidate_created",
        entity_type="response_case_candidate",
        entity_id=candidate.id,
        status="ok",
        metadata={
            "review_id": str(review.id),
            "response_case_id": str(case.id),
            "match_score": match_score,
            "retrieval_threshold": retrieval_threshold,
            "gap": gap,
        },
    )
    return candidate
