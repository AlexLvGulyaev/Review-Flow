from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.ch_entities import (
    CaseMatchResult,
    ResponseCase,
    ResponseCaseDecision,
    ResponseCaseFeedback,
)
from app.services.controlled_hybrid.confidence import ConfidenceBand
from app.services.controlled_hybrid.retrieval import RetrievedCaseCandidate


def get_current_decision(db: Session, review_id: uuid.UUID) -> ResponseCaseDecision | None:
    return db.scalar(
        select(ResponseCaseDecision)
        .where(
            ResponseCaseDecision.review_id == review_id,
            ResponseCaseDecision.is_current.is_(True),
        )
        .order_by(ResponseCaseDecision.created_at.desc())
    )


def supersede_current_decisions(db: Session, review_id: uuid.UUID) -> None:
    db.execute(
        update(ResponseCaseDecision)
        .where(
            ResponseCaseDecision.review_id == review_id,
            ResponseCaseDecision.is_current.is_(True),
        )
        .values(is_current=False)
    )


def persist_match_results(
    db: Session,
    *,
    review_id: uuid.UUID,
    ranked: list[RetrievedCaseCandidate],
    selected_case_id: uuid.UUID | None,
    decision_id: uuid.UUID | None,
) -> list[CaseMatchResult]:
    rows: list[CaseMatchResult] = []
    for rank, candidate in enumerate(ranked, start=1):
        row = CaseMatchResult(
            review_id=review_id,
            response_case_id=candidate.response_case.id,
            response_case_decision_id=decision_id,
            match_score=candidate.match_score,
            rank=rank,
            match_method="example_fuzzy",
            is_selected=selected_case_id == candidate.response_case.id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(row)
        rows.append(row)
    db.flush()
    return rows


def create_decision(
    db: Session,
    *,
    review_id: uuid.UUID,
    response_case: ResponseCase,
    match_score: float,
    decision_source: str,
    is_operator_override: bool = False,
    legacy_classification_id: uuid.UUID | None = None,
) -> ResponseCaseDecision:
    supersede_current_decisions(db, review_id)
    now = datetime.now(timezone.utc)
    row = ResponseCaseDecision(
        review_id=review_id,
        response_case_id=response_case.id,
        decision_source=decision_source,
        match_confidence=match_score,
        is_operator_override=is_operator_override,
        legacy_classification_id=legacy_classification_id,
        is_current=True,
        selected_at=now,
        created_at=now,
    )
    db.add(row)
    db.flush()
    return row


def record_feedback(
    db: Session,
    *,
    review_id: uuid.UUID,
    feedback_type: str,
    response_case_id: uuid.UUID | None = None,
    response_case_decision_id: uuid.UUID | None = None,
    rejection_reason: str | None = None,
    comment: str | None = None,
    suggested_case_id: uuid.UUID | None = None,
    legacy_rejection_feedback_id: uuid.UUID | None = None,
    operator_id: str = "operator-ui",
) -> ResponseCaseFeedback:
    row = ResponseCaseFeedback(
        review_id=review_id,
        response_case_id=response_case_id,
        response_case_decision_id=response_case_decision_id,
        feedback_type=feedback_type,
        rejection_reason=rejection_reason,
        operator_id=operator_id,
        comment=comment,
        suggested_case_id=suggested_case_id,
        legacy_rejection_feedback_id=legacy_rejection_feedback_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()
    return row


def band_requires_operator_confirmation(band: ConfidenceBand) -> bool:
    return band in (ConfidenceBand.MEDIUM, ConfidenceBand.LOW)
