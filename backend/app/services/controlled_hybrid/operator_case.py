from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ch_entities import (
    CaseMatchResult,
    ResponseCase,
    ResponseCaseCandidate,
)
from app.models.entities import Review, ReviewClassification
from app.schemas.operator import (
    CaseCandidateCreateRequest,
    OperatorEscalationRequest,
    OperatorReviewDetail,
    ResponseCaseOverrideRequest,
)
from app.services.classification_refs import ClassificationRefsService
from app.services.controlled_hybrid.confidence import evaluate_confidence
from app.services.controlled_hybrid.decisions import (
    create_decision,
    get_current_decision,
    record_feedback,
)
from app.services.controlled_hybrid.draft_generation import CaseDraftGenerationService
from app.services.controlled_hybrid.retrieval import ResponseCaseRetrievalService
from app.services.ai_provider_runtime import AIProviderRuntime
from app.services.controlled_hybrid.presenter import is_ch_response
from app.services.controlled_hybrid.auto_learning import (
    CANDIDATE_TYPE_NEW_RESPONSE_CASE,
    maybe_create_example_learning_candidate,
)
from app.services.operational_log import log_event
from app.services.review_helpers import latest_classification, latest_response

ESCALATION_REASONS = frozenset(
    {"no_case_fits", "case_correction_needed", "bad_llm_draft"}
)
OPERATOR_ID = "operator-ui"


def _sync_review_classification_from_ids(
    db: Session,
    review: Review,
    scenario_id: uuid.UUID,
    sentiment_id: uuid.UUID,
    priority_id: uuid.UUID,
    *,
    source: str = "operator_escalation",
) -> ReviewClassification:
    refs = ClassificationRefsService(db)
    scenario_row = refs.get_scenario_by_id(scenario_id)
    sentiment_row = refs.get_sentiment_by_id(sentiment_id)
    priority_row = refs.get_priority_by_id(priority_id)
    cls = latest_classification(review)
    if cls:
        cls.scenario_id = scenario_id
        cls.sentiment_id = sentiment_id
        cls.priority_id = priority_id
        cls.classification_source = source
        refs.sync_classification_legacy(cls, scenario_row, sentiment_row, priority_row)
        db.flush()
        return cls
    row = ReviewClassification(
        review_id=review.id,
        scenario_id=scenario_id,
        sentiment_id=sentiment_id,
        priority_id=priority_id,
        classification_source=source,
        confidence=None,
        rating=review.rating,
        created_at=datetime.now(timezone.utc),
    )
    refs.sync_classification_legacy(row, scenario_row, sentiment_row, priority_row)
    db.add(row)
    db.flush()
    return row


def _sync_review_classification_from_case(
    db: Session,
    review: Review,
    case: ResponseCase,
    match_score: float,
) -> ReviewClassification:
    refs = ClassificationRefsService(db)
    scenario_row = refs.get_scenario_by_id(case.scenario_id)
    sentiment_row = refs.get_sentiment_by_id(case.sentiment_id)
    priority_row = refs.get_priority_by_id(case.priority_id)
    cls = latest_classification(review)
    if cls:
        cls.scenario_id = case.scenario_id
        cls.sentiment_id = case.sentiment_id
        cls.priority_id = case.priority_id
        cls.classification_source = "derived_from_response_case"
        cls.confidence = match_score
        refs.sync_classification_legacy(cls, scenario_row, sentiment_row, priority_row)
        db.flush()
        return cls
    row = ReviewClassification(
        review_id=review.id,
        scenario_id=case.scenario_id,
        sentiment_id=case.sentiment_id,
        priority_id=case.priority_id,
        classification_source="derived_from_response_case",
        confidence=match_score,
        rating=review.rating,
        created_at=datetime.now(timezone.utc),
    )
    refs.sync_classification_legacy(row, scenario_row, sentiment_row, priority_row)
    db.add(row)
    db.flush()
    return row


def _is_case_resolved(db: Session, review_id: uuid.UUID) -> bool:
    decision = get_current_decision(db, review_id)
    return bool(decision and decision.is_operator_override)


def _retrieval_snapshot(db: Session, review_id: uuid.UUID, decision) -> dict:
    rows = db.scalars(
        select(CaseMatchResult)
        .where(CaseMatchResult.review_id == review_id)
        .order_by(CaseMatchResult.rank.asc())
    ).all()
    candidates = []
    system_selected_case_id = None
    system_selected_case_code = None
    system_selected_case_title = None
    for row in rows:
        case = db.get(ResponseCase, row.response_case_id)
        entry = {
            "response_case_id": str(row.response_case_id),
            "case_code": case.case_code if case else None,
            "title": case.title if case else None,
            "match_score": float(row.match_score),
            "rank": row.rank,
            "is_selected": row.is_selected,
        }
        candidates.append(entry)
        if row.is_selected and case:
            system_selected_case_id = str(case.id)
            system_selected_case_code = case.case_code
            system_selected_case_title = case.title
    if decision and not system_selected_case_id:
        case = db.get(ResponseCase, decision.response_case_id)
        if case:
            system_selected_case_id = str(case.id)
            system_selected_case_code = case.case_code
            system_selected_case_title = case.title
    return {
        "system_selected_case_id": system_selected_case_id,
        "system_selected_case_code": system_selected_case_code,
        "system_selected_case_title": system_selected_case_title,
        "retrieval_candidates": candidates,
    }


def _enable_operator_editor(resp, *, escalation_reason: str | None = None) -> None:
    meta = dict(resp.generation_metadata or {})
    meta["operator_editor_enabled"] = True
    if escalation_reason:
        meta["escalation_reason"] = escalation_reason
    if escalation_reason == "no_case_fits":
        meta["case_escalated"] = True
        meta["case_confirmation_not_required"] = True
        meta["requires_operator_case_confirmation"] = False
    resp.generation_metadata = meta
    resp.updated_at = datetime.now(timezone.utc)


def confirm_response_case(db: Session, review_id: uuid.UUID) -> OperatorReviewDetail:
    from app.services.moderation import build_operator_detail, load_review_detail

    review = load_review_detail(db, review_id)
    resp = latest_response(review)
    if not resp or not is_ch_response(resp):
        raise HTTPException(status_code=400, detail="Review is not on Controlled Hybrid pipeline")

    decision = get_current_decision(db, review_id)
    if not decision:
        raise HTTPException(status_code=409, detail="No response case decision to confirm")

    meta = dict(resp.generation_metadata or {})
    meta["operator_case_confirmed"] = True
    resp.generation_metadata = meta
    resp.updated_at = datetime.now(timezone.utc)

    if decision.decision_source == "retrieval_auto":
        decision.decision_source = "retrieval_operator"
    db.flush()

    maybe_create_example_learning_candidate(db, review, decision)

    log_event(
        db,
        event_type="operator_case_confirmed",
        entity_type="review",
        entity_id=review_id,
        status="ok",
        metadata={"response_case_id": str(decision.response_case_id)},
    )
    db.commit()
    review = load_review_detail(db, review_id)
    return build_operator_detail(db, review)


def override_response_case(
    db: Session,
    review_id: uuid.UUID,
    payload: ResponseCaseOverrideRequest,
) -> OperatorReviewDetail:
    from app.services.moderation import build_operator_detail, load_review_detail

    review = load_review_detail(db, review_id)
    resp = latest_response(review)
    if not resp:
        raise HTTPException(status_code=404, detail="Review response not found")

    case = db.get(ResponseCase, payload.response_case_id)
    if not case or not case.is_active:
        raise HTTPException(status_code=404, detail="Response case not found or inactive")

    previous = get_current_decision(db, review_id)
    previous_case_id = previous.response_case_id if previous else None

    retrieval = ResponseCaseRetrievalService(db).retrieve(review.review_text)
    match_score = 0.0
    for candidate in retrieval.candidates:
        if candidate.response_case.id == case.id:
            match_score = candidate.match_score
            break

    decision = create_decision(
        db,
        review_id=review_id,
        response_case=case,
        match_score=match_score,
        decision_source="operator_override",
        is_operator_override=True,
        legacy_classification_id=latest_classification(review).id if latest_classification(review) else None,
    )

    record_feedback(
        db,
        review_id=review_id,
        feedback_type="wrong_case",
        response_case_id=previous_case_id,
        response_case_decision_id=decision.id,
        suggested_case_id=case.id,
        comment=payload.comment,
    )

    _sync_review_classification_from_case(db, review, case, match_score)

    customer_name = review.customer.customer_name if review.customer else "Клиент"
    resolved = AIProviderRuntime(db).resolve(review_id=review_id)
    draft, gen_latency, gen_prompt, gen_metadata = CaseDraftGenerationService(db, resolved).generate(
        review=review,
        response_case=case,
        customer_name=customer_name,
    )
    from app.services.ch_runtime_settings import ChRuntimeSettingsService

    runtime = ChRuntimeSettingsService(db).effective()
    confidence = evaluate_confidence(
        match_score,
        case.confidence_threshold,
        medium_delta=runtime.confidence_medium_delta,
    )
    gen_metadata.update(
        {
            "confidence_band": confidence.band.value,
            "match_confidence": match_score,
            "operator_case_confirmed": True,
            "requires_operator_case_confirmation": False,
            "operator_editor_enabled": True,
        }
    )

    resp.draft_response = draft
    resp.template_id = None
    resp.prompt_version_id = gen_prompt.id
    resp.generation_metadata = gen_metadata
    resp.moderation_status = "pending_review"
    resp.publication_status = "not_published"
    resp.updated_at = datetime.now(timezone.utc)

    for row in db.scalars(select(CaseMatchResult).where(CaseMatchResult.review_id == review_id)).all():
        row.is_selected = row.response_case_id == case.id
        row.response_case_decision_id = decision.id

    log_event(
        db,
        event_type="operator_case_override",
        entity_type="review",
        entity_id=review_id,
        latency_ms=gen_latency,
        status="ok",
        metadata={
            "response_case_id": str(case.id),
            "previous_case_id": str(previous_case_id) if previous_case_id else None,
        },
    )
    db.commit()
    review = load_review_detail(db, review_id)
    return build_operator_detail(db, review)


def create_case_candidate(
    db: Session,
    review_id: uuid.UUID,
    payload: CaseCandidateCreateRequest,
) -> OperatorReviewDetail:
    from app.services.moderation import build_operator_detail, load_review_detail

    review = load_review_detail(db, review_id)
    row = ResponseCaseCandidate(
        review_id=review_id,
        status="pending_admin",
        candidate_type=CANDIDATE_TYPE_NEW_RESPONSE_CASE,
        proposed_title=payload.proposed_title,
        proposed_description=payload.proposed_description,
        proposed_scenario_id=payload.proposed_scenario_id,
        proposed_sentiment_id=payload.proposed_sentiment_id,
        proposed_priority_id=payload.proposed_priority_id,
        proposed_product_area_id=payload.proposed_product_area_id,
        proposed_topic_id=payload.proposed_topic_id,
        proposed_response_policy=payload.proposed_response_policy,
        proposed_approved_response_text=payload.proposed_approved_response_text,
        proposed_by_operator_id="operator-ui",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()

    record_feedback(
        db,
        review_id=review_id,
        feedback_type="new_case_needed",
        comment=payload.operator_comment or payload.proposed_description,
    )

    resp = latest_response(review)
    if resp:
        meta = dict(resp.generation_metadata or {})
        meta["candidate_id"] = str(row.id)
        meta["requires_operator_case_confirmation"] = True
        meta["operator_case_confirmed"] = False
        resp.generation_metadata = meta
        resp.updated_at = datetime.now(timezone.utc)

    log_event(
        db,
        event_type="case_candidate_created",
        entity_type="review",
        entity_id=review_id,
        status="ok",
        metadata={"candidate_id": str(row.id)},
    )
    db.commit()
    review = load_review_detail(db, review_id)
    return build_operator_detail(db, review)


def escalate_response_case(
    db: Session,
    review_id: uuid.UUID,
    payload: OperatorEscalationRequest,
) -> OperatorReviewDetail:
    from app.services.moderation import build_operator_detail, load_review_detail

    if payload.escalation_reason not in ESCALATION_REASONS:
        raise HTTPException(status_code=400, detail="Invalid escalation reason")

    comment = payload.comment.strip()
    if not comment:
        raise HTTPException(status_code=400, detail="Operator comment is required")

    review = load_review_detail(db, review_id)
    resp = latest_response(review)
    if not resp or not is_ch_response(resp):
        raise HTTPException(status_code=400, detail="Review is not on Controlled Hybrid pipeline")

    if _is_case_resolved(db, review_id):
        raise HTTPException(
            status_code=409,
            detail="Response case already resolved by operator override",
        )

    meta = resp.generation_metadata or {}
    if meta.get("case_escalated"):
        raise HTTPException(status_code=409, detail="Case escalation already recorded for this review")

    decision = get_current_decision(db, review_id)
    snapshot = _retrieval_snapshot(db, review_id, decision)
    candidate_id = None

    if payload.escalation_reason == "no_case_fits":
        if not payload.scenario_id or not payload.sentiment_id or not payload.priority_id:
            raise HTTPException(
                status_code=400,
                detail="Scenario, sentiment and priority are required for no_case_fits escalation",
            )
        refs = ClassificationRefsService(db)
        if not refs.get_scenario_by_id(payload.scenario_id):
            raise HTTPException(status_code=400, detail="Invalid scenario_id")
        if not refs.get_sentiment_by_id(payload.sentiment_id):
            raise HTTPException(status_code=400, detail="Invalid sentiment_id")
        if not refs.get_priority_by_id(payload.priority_id):
            raise HTTPException(status_code=400, detail="Invalid priority_id")

        _sync_review_classification_from_ids(
            db,
            review,
            payload.scenario_id,
            payload.sentiment_id,
            payload.priority_id,
        )

        top_score = None
        if snapshot.get("retrieval_candidates"):
            top_score = snapshot["retrieval_candidates"][0].get("match_score")

        context = {
            "escalation_reason": payload.escalation_reason,
            "operator_comment": comment,
            "review_text": review.review_text,
            "operator_scenario_id": str(payload.scenario_id),
            "operator_sentiment_id": str(payload.sentiment_id),
            "operator_priority_id": str(payload.priority_id),
            **snapshot,
        }
        candidate = ResponseCaseCandidate(
            review_id=review_id,
            status="new",
            candidate_type=CANDIDATE_TYPE_NEW_RESPONSE_CASE,
            proposed_title="Эскалация: требуется новая типовая ситуация",
            proposed_description=json.dumps(context, ensure_ascii=False, indent=2),
            proposed_scenario_id=payload.scenario_id,
            proposed_sentiment_id=payload.sentiment_id,
            proposed_priority_id=payload.priority_id,
            proposed_by_operator_id=OPERATOR_ID,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(candidate)
        db.flush()
        candidate_id = candidate.id

        record_feedback(
            db,
            review_id=review_id,
            feedback_type="new_case_needed",
            response_case_id=decision.response_case_id if decision else None,
            response_case_decision_id=decision.id if decision else None,
            rejection_reason=payload.escalation_reason,
            comment=comment,
        )

        meta = dict(resp.generation_metadata or {})
        meta["retrieval_suggestion"] = {
            "response_case_id": snapshot.get("system_selected_case_id"),
            "case_code": snapshot.get("system_selected_case_code"),
            "title": snapshot.get("system_selected_case_title"),
            "match_score": top_score,
        }
        resp.generation_metadata = meta
    elif payload.escalation_reason == "case_correction_needed":
        if not decision:
            raise HTTPException(status_code=409, detail="No response case selected to escalate")
        record_feedback(
            db,
            review_id=review_id,
            feedback_type="wrong_policy",
            response_case_id=decision.response_case_id,
            response_case_decision_id=decision.id,
            rejection_reason=payload.escalation_reason,
            comment=comment,
        )
    elif payload.escalation_reason == "bad_llm_draft":
        if not decision:
            raise HTTPException(status_code=409, detail="No response case selected to escalate")
        draft = resp.draft_response or ""
        record_feedback(
            db,
            review_id=review_id,
            feedback_type="wrong_response_text",
            response_case_id=decision.response_case_id,
            response_case_decision_id=decision.id,
            rejection_reason=payload.escalation_reason,
            comment=f"{comment}\n\n--- LLM draft ---\n{draft}".strip(),
        )

    _enable_operator_editor(resp, escalation_reason=payload.escalation_reason)

    log_event(
        db,
        event_type="operator_case_escalated",
        entity_type="review",
        entity_id=review_id,
        status="ok",
        metadata={
            "escalation_reason": payload.escalation_reason,
            "candidate_id": str(candidate_id) if candidate_id else None,
            "response_case_id": str(decision.response_case_id) if decision else None,
            "draft_response": resp.draft_response,
        },
    )
    db.commit()
    review = load_review_detail(db, review_id)
    return build_operator_detail(db, review)
