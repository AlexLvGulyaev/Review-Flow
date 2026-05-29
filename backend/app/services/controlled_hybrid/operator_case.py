from __future__ import annotations

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
from app.schemas.operator import (
    CaseCandidateCreateRequest,
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
from app.services.operational_log import log_event
from app.services.review_helpers import latest_classification, latest_response


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

    cls = latest_classification(review)
    if cls:
        refs = ClassificationRefsService(db)
        cls.scenario_id = case.scenario_id
        cls.sentiment_id = case.sentiment_id
        cls.priority_id = case.priority_id
        refs.sync_classification_legacy(
            cls,
            refs.get_scenario_by_id(case.scenario_id),
            refs.get_sentiment_by_id(case.sentiment_id),
            refs.get_priority_by_id(case.priority_id),
        )

    customer_name = review.customer.customer_name if review.customer else "Клиент"
    resolved = AIProviderRuntime(db).resolve(review_id=review_id)
    draft, gen_latency, gen_prompt, gen_metadata = CaseDraftGenerationService(db, resolved).generate(
        review=review,
        response_case=case,
        customer_name=customer_name,
    )
    confidence = evaluate_confidence(match_score, case.confidence_threshold)
    gen_metadata.update(
        {
            "confidence_band": confidence.band.value,
            "match_confidence": match_score,
            "operator_case_confirmed": True,
            "requires_operator_case_confirmation": False,
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
