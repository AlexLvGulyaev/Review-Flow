"""Classify source review when a response case is created from an escalation candidate."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.ch_entities import (
    CaseMatchResult,
    ResponseCase,
    ResponseCaseExample,
)
from app.models.entities import Review, ReviewResponse
from app.services.controlled_hybrid.decisions import (
    create_decision,
    persist_match_results,
)
from app.services.controlled_hybrid.retrieval import (
    ResponseCaseRetrievalService,
    RetrievedCaseCandidate,
)
from app.services.review_helpers import latest_response

DECISION_SOURCE_CANDIDATE_LEARNING = "candidate_learning"
DECISION_SOURCE_CANDIDATE_MERGE = "candidate_merge"
CANDIDATE_LEARNING_MATCH_SCORE = 1.0
EXAMPLE_SOURCE_CANDIDATE_LEARNING = "candidate_learning"
EXAMPLE_SOURCE_OPERATOR_CONFIRMED = "operator_confirmed_learning"
SELECTION_SOURCE_CREATED = "Создано из кандидата / обучение"
SELECTION_SOURCE_MERGED = "Присоединено к существующей ТС / обучение"


def ensure_response_case_example(
    db: Session,
    *,
    response_case_id: uuid.UUID,
    review: Review,
    now: datetime | None = None,
    source: str = EXAMPLE_SOURCE_CANDIDATE_LEARNING,
    rewrite_source: bool = True,
) -> ResponseCaseExample:
    now = now or datetime.now(timezone.utc)
    existing = db.scalar(
        select(ResponseCaseExample).where(
            ResponseCaseExample.response_case_id == response_case_id,
            ResponseCaseExample.source_review_id == review.id,
        )
    )
    if existing:
        if rewrite_source and existing.source != source:
            existing.source = source
            existing.updated_at = now
        return existing
    row = ResponseCaseExample(
        response_case_id=response_case_id,
        example_text=review.review_text,
        source=source,
        source_review_id=review.id,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.flush()
    return row


def rebuild_retrieval_history_for_learned_case(
    db: Session,
    *,
    review: Review,
    response_case: ResponseCase,
    decision_id: uuid.UUID,
) -> None:
    db.execute(delete(CaseMatchResult).where(CaseMatchResult.review_id == review.id))
    db.flush()

    learned = RetrievedCaseCandidate(
        response_case=response_case,
        match_score=CANDIDATE_LEARNING_MATCH_SCORE,
        best_example_id=None,
        best_example_text=review.review_text,
    )
    retrieval = ResponseCaseRetrievalService(db).retrieve(review.review_text)
    ranked = [learned]
    for candidate in retrieval.candidates:
        if candidate.response_case.id == response_case.id:
            continue
        ranked.append(candidate)

    persist_match_results(
        db,
        review_id=review.id,
        ranked=ranked,
        selected_case_id=response_case.id,
        decision_id=decision_id,
    )
    for row in db.scalars(
        select(CaseMatchResult).where(
            CaseMatchResult.review_id == review.id,
            CaseMatchResult.response_case_id == response_case.id,
        )
    ).all():
        row.match_score = CANDIDATE_LEARNING_MATCH_SCORE
        row.match_method = "candidate_learning"
        row.rank = 1
        row.is_selected = True


def apply_candidate_learning_classification(
    db: Session,
    *,
    review: Review,
    response_case: ResponseCase,
    preserve_published_response: bool = True,
    decision_source: str = DECISION_SOURCE_CANDIDATE_LEARNING,
    selection_source_label: str = SELECTION_SOURCE_CREATED,
) -> uuid.UUID:
    """
    Link review to response case after admin creates/approves TS from candidate.
    Returns new current decision id.
    """
    now = datetime.now(timezone.utc)
    ensure_response_case_example(
        db, response_case_id=response_case.id, review=review, now=now
    )
    decision = create_decision(
        db,
        review_id=review.id,
        response_case=response_case,
        match_score=CANDIDATE_LEARNING_MATCH_SCORE,
        decision_source=decision_source,
    )
    rebuild_retrieval_history_for_learned_case(
        db,
        review=review,
        response_case=response_case,
        decision_id=decision.id,
    )

    resp = latest_response(review)
    if resp:
        meta = dict(resp.generation_metadata or {})
        meta["confidence_band"] = "high"
        meta["match_confidence"] = CANDIDATE_LEARNING_MATCH_SCORE
        meta["decision_source"] = decision_source
        meta["selection_source"] = selection_source_label
        meta["operator_case_confirmed"] = True
        meta["requires_operator_case_confirmation"] = False
        meta.pop("case_escalated", None)
        meta.pop("escalation_reason", None)
        resp.generation_metadata = meta
        resp.updated_at = now

    return decision.id


def apply_candidate_merge_classification(
    db: Session,
    *,
    review: Review,
    response_case: ResponseCase,
    preserve_published_response: bool = True,
) -> uuid.UUID:
    """
    Scenario B: operator escalated no_case_fits, admin merged into existing TS.
    Sets final admin decision; does not rewrite retrieval history scores.
    """
    now = datetime.now(timezone.utc)
    ensure_response_case_example(
        db, response_case_id=response_case.id, review=review, now=now
    )
    decision = create_decision(
        db,
        review_id=review.id,
        response_case=response_case,
        match_score=CANDIDATE_LEARNING_MATCH_SCORE,
        decision_source=DECISION_SOURCE_CANDIDATE_MERGE,
    )

    resp = latest_response(review)
    if resp:
        meta = dict(resp.generation_metadata or {})
        meta["confidence_band"] = "high"
        meta["match_confidence"] = CANDIDATE_LEARNING_MATCH_SCORE
        meta["decision_source"] = DECISION_SOURCE_CANDIDATE_MERGE
        meta["selection_source"] = SELECTION_SOURCE_MERGED
        meta["operator_case_confirmed"] = True
        meta["requires_operator_case_confirmation"] = False
        meta.pop("case_escalated", None)
        meta.pop("escalation_reason", None)
        resp.generation_metadata = meta
        resp.updated_at = now

    return decision.id


def should_apply_merge_classification(
    db: Session,
    review: Review,
    candidate,
) -> bool:
    """True only for no_case_fits new-case candidates merged into existing TS."""
    from app.services.controlled_hybrid.auto_learning import CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE
    from app.services.controlled_hybrid.presenter import is_no_case_fits_state

    if candidate.candidate_type == CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE:
        return False
    resp = latest_response(review)
    meta = dict(resp.generation_metadata or {}) if resp else {}
    return is_no_case_fits_state(db, review.id, meta)


def restore_review_decision_and_retrieval(
    db: Session,
    *,
    review: Review,
    response_case: ResponseCase,
    decision_source: str,
    match_score: float,
    confidence_band: str,
) -> uuid.UUID:
    """Revert erroneous merge: restore operator/automatic decision and retrieval ranks."""
    from app.services.controlled_hybrid.confidence import evaluate_confidence

    now = datetime.now(timezone.utc)
    decision = create_decision(
        db,
        review_id=review.id,
        response_case=response_case,
        match_score=match_score,
        decision_source=decision_source,
    )

    db.execute(delete(CaseMatchResult).where(CaseMatchResult.review_id == review.id))
    db.flush()

    retrieval = ResponseCaseRetrievalService(db).retrieve(review.review_text)
    ranked: list[RetrievedCaseCandidate] = []
    selected = RetrievedCaseCandidate(
        response_case=response_case,
        match_score=match_score,
        best_example_id=None,
        best_example_text=review.review_text,
    )
    ranked.append(selected)
    for candidate in retrieval.candidates:
        if candidate.response_case.id == response_case.id:
            continue
        ranked.append(candidate)

    persist_match_results(
        db,
        review_id=review.id,
        ranked=ranked,
        selected_case_id=response_case.id,
        decision_id=decision.id,
    )

    resp = latest_response(review)
    if resp:
        band = confidence_band or evaluate_confidence(
            match_score, response_case.confidence_threshold
        ).band.value
        meta = dict(resp.generation_metadata or {})
        meta["confidence_band"] = band
        meta["match_confidence"] = match_score
        meta["decision_source"] = decision_source
        meta["operator_case_confirmed"] = True
        meta["requires_operator_case_confirmation"] = False
        meta.pop("selection_source", None)
        meta.pop("case_escalated", None)
        meta.pop("escalation_reason", None)
        resp.generation_metadata = meta
        resp.updated_at = now

    return decision.id


def is_published_operator_response(resp: ReviewResponse | None) -> bool:
    return bool(
        resp
        and resp.publication_status == "published"
        and resp.moderation_status == "approved"
    )
