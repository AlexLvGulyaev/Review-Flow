import time
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import (
    InteractionScenario,
    OperationalLog,
    PriorityLevel,
    RejectionFeedback,
    Review,
    ReviewClassification,
    ReviewResponse,
    SentimentProfile,
)
from app.schemas.operator import (
    OperatorReviewDetail,
    OperationalLogOut,
    RejectionFeedbackOut,
    TemplateOut,
)
from app.services.classification_out import build_classification_out
from app.services.classification_refs import ClassificationRefsService
from app.services.review_ids import customer_display_request_number
from app.services.operational_log import log_event
from app.core.config import settings
from app.services.controlled_hybrid.decisions import get_current_decision, record_feedback
from app.services.controlled_hybrid.presenter import (
    build_case_alternatives,
    build_selected_case_out,
    ch_approve_guard,
)
from app.services.review_helpers import latest_classification, latest_response

OPERATOR_PLACEHOLDER = "operator-ui"

REJECTION_REASONS = frozenset(
    {"classification_error", "unsuitable_template", "history_ignored"}
)


def _display_request_number(review: Review) -> str | None:
    num = customer_display_request_number(
        review.request_number,
        review.order_number,
        review.request_sequence,
    )
    return num or None


def _feedback_out(db: Session, row: RejectionFeedback) -> RejectionFeedbackOut:
    refs = ClassificationRefsService(db)
    return RejectionFeedbackOut(
        id=row.id,
        rejection_reason=row.rejection_reason,
        llm_scenario=refs.ref_for_scenario_id(row.llm_scenario_id),
        llm_sentiment=refs.ref_for_sentiment_id(row.llm_sentiment_id),
        llm_priority=refs.ref_for_priority_id(row.llm_priority_id),
        operator_corrected_scenario=refs.ref_for_scenario_id(row.operator_corrected_scenario_id),
        operator_corrected_sentiment=refs.ref_for_sentiment_id(row.operator_corrected_sentiment_id),
        operator_corrected_priority=refs.ref_for_priority_id(row.operator_corrected_priority_id),
        optional_comment=row.optional_comment,
        created_at=row.created_at,
    )


def load_review_detail(db: Session, review_id: uuid.UUID) -> Review:
    review = (
        db.query(Review)
        .options(
            joinedload(Review.customer),
            joinedload(Review.service_case),
            joinedload(Review.classifications).joinedload(ReviewClassification.matched_phrase),
            joinedload(Review.responses).joinedload(ReviewResponse.template),
        )
        .filter(Review.id == review_id)
        .first()
    )
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


def build_operator_detail(db: Session, review: Review, *, log_opened: bool = False) -> OperatorReviewDetail:
    if log_opened:
        log_event(
            db,
            event_type="operator_review_opened",
            entity_type="review",
            entity_id=review.id,
            status="ok",
        )
        db.flush()

    cls = latest_classification(review)
    resp = latest_response(review)
    matched_phrase_text = None
    if cls and cls.matched_phrase:
        matched_phrase_text = cls.matched_phrase.phrase_text

    template_out = None
    refs = ClassificationRefsService(db)
    if resp and resp.template:
        t = resp.template
        template_out = TemplateOut(
            template_id=t.id,
            template_text=t.template_text,
            title=t.title,
            scenario=refs.ref_for_scenario_id(t.scenario_id),
            sentiment=refs.ref_for_sentiment_id(t.sentiment_id),
            priority=refs.ref_for_priority_id(t.priority_id),
        )

    feedback_rows = db.scalars(
        select(RejectionFeedback)
        .where(RejectionFeedback.review_id == review.id)
        .order_by(RejectionFeedback.created_at.asc())
    ).all()
    feedback_history = [_feedback_out(db, f) for f in feedback_rows]
    latest_feedback = feedback_history[-1] if feedback_history else None
    ai_review_mode = "manual_override" if latest_feedback else "review"

    logs = db.scalars(
        select(OperationalLog)
        .where(
            OperationalLog.entity_type == "review",
            OperationalLog.entity_id == review.id,
        )
        .order_by(OperationalLog.created_at.asc())
    ).all()

    llm_model = None
    pipeline_mode = "legacy"
    selected_case = None
    case_alternatives: list = []
    if resp and isinstance(resp.generation_metadata, dict):
        llm_model = resp.generation_metadata.get("model") or resp.generation_metadata.get("model_name")
        if resp.generation_metadata.get("pipeline") == "controlled_hybrid":
            pipeline_mode = "controlled_hybrid"
            decision = get_current_decision(db, review.id)
            selected_case = build_selected_case_out(db, decision, resp)
            case_alternatives = build_case_alternatives(db, review.id)
    elif settings.ch_pipeline_enabled:
        pipeline_mode = "controlled_hybrid"

    return OperatorReviewDetail(
        review_id=review.id,
        request_number=_display_request_number(review),
        order_number=review.order_number,
        customer_name=review.customer.customer_name if review.customer else None,
        customer_email=review.customer.email if review.customer else None,
        service_case_title=review.service_case.case_title if review.service_case else None,
        product_area=review.product_area,
        rating=review.rating,
        review_text=review.review_text,
        created_at=review.created_at,
        classification=build_classification_out(
            db,
            cls,
            matched_phrase_text=matched_phrase_text,
        )
        if cls
        else None,
        matched_phrase_text=matched_phrase_text,
        template=template_out,
        draft_response=resp.draft_response if resp else None,
        final_response=resp.final_response if resp else None,
        moderation_status=resp.moderation_status if resp else None,
        publication_status=resp.publication_status if resp else None,
        operational_logs=[
            OperationalLogOut(
                event_type=log.event_type,
                status=log.status,
                error_message=log.error_message,
                created_at=log.created_at,
            )
            for log in logs
        ],
        updated_at=resp.updated_at if resp else None,
        llm_model=llm_model,
        ai_review_mode=ai_review_mode,
        latest_rejection_feedback=latest_feedback,
        rejection_feedback_history=feedback_history,
        pipeline_mode=pipeline_mode,
        selected_response_case=selected_case,
        case_alternatives=case_alternatives,
    )


def get_review_response_row(db: Session, review_id: uuid.UUID) -> ReviewResponse:
    review = load_review_detail(db, review_id)
    resp = latest_response(review)
    if not resp:
        raise HTTPException(status_code=404, detail="Review response not found")
    return resp


def approve_review(
    db: Session, review_id: uuid.UUID, final_response: str
) -> OperatorReviewDetail:
    start = time.perf_counter()
    resp = get_review_response_row(db, review_id)
    ch_approve_guard(resp)
    now = datetime.now(timezone.utc)
    resp.final_response = final_response.strip()
    resp.moderation_status = "approved"
    resp.publication_status = "published"
    resp.operator_id = OPERATOR_PLACEHOLDER
    resp.updated_at = now

    mod_ms = int((time.perf_counter() - start) * 1000)
    log_event(
        db,
        event_type="moderation_approved",
        entity_type="review",
        entity_id=review_id,
        latency_ms=mod_ms,
        status="ok",
        metadata={"action": "approve"},
    )
    log_event(
        db,
        event_type="mock_publication_completed",
        entity_type="review",
        entity_id=review_id,
        status="ok",
    )
    db.commit()

    review = load_review_detail(db, review_id)
    return build_operator_detail(db, review)


def reject_review(db: Session, review_id: uuid.UUID, reason: str) -> ReviewResponse:
    start = time.perf_counter()
    resp = get_review_response_row(db, review_id)
    now = datetime.now(timezone.utc)
    resp.moderation_status = "rejected"
    resp.publication_status = "not_published"
    resp.operator_id = OPERATOR_PLACEHOLDER
    resp.updated_at = now

    log_event(
        db,
        event_type="moderation_rejected",
        entity_type="review",
        entity_id=review_id,
        latency_ms=int((time.perf_counter() - start) * 1000),
        status="ok",
        error_message=reason,
        metadata={"action": "reject"},
    )
    db.commit()
    return resp


def submit_ai_draft_rejection_feedback(
    db: Session, review_id: uuid.UUID, payload
) -> OperatorReviewDetail:
    if payload.rejection_reason not in REJECTION_REASONS:
        raise HTTPException(status_code=400, detail="Invalid rejection reason")

    review = load_review_detail(db, review_id)
    cls = latest_classification(review)
    if not cls:
        raise HTTPException(status_code=400, detail="Classification not found")

    refs = ClassificationRefsService(db)
    llm_scenario_id = cls.scenario_id
    llm_sentiment_id = cls.sentiment_id
    llm_priority_id = cls.priority_id
    llm_scenario_row = refs.get_scenario_by_id(llm_scenario_id) if llm_scenario_id else None
    llm_sentiment_row = refs.get_sentiment_by_id(llm_sentiment_id) if llm_sentiment_id else None
    llm_priority_row = refs.get_priority_by_id(llm_priority_id) if llm_priority_id else None

    corrected_scenario_row = None
    corrected_sentiment_row = None
    corrected_priority_row = None

    if payload.rejection_reason == "classification_error":
        corrected_ids = [
            payload.operator_corrected_scenario_id,
            payload.operator_corrected_sentiment_id,
            payload.operator_corrected_priority_id,
        ]
        if not any(corrected_ids):
            raise HTTPException(
                status_code=400,
                detail="Corrected scenario, tone, or priority required",
            )
        if payload.operator_corrected_scenario_id:
            corrected_scenario_row = refs.get_scenario_by_id(payload.operator_corrected_scenario_id)
        if payload.operator_corrected_sentiment_id:
            corrected_sentiment_row = refs.get_sentiment_by_id(payload.operator_corrected_sentiment_id)
        if payload.operator_corrected_priority_id:
            corrected_priority_row = refs.get_priority_by_id(payload.operator_corrected_priority_id)
        changed = (
            (
                corrected_scenario_row
                and cls.scenario_id
                and corrected_scenario_row.id != cls.scenario_id
            )
            or (
                corrected_sentiment_row
                and cls.sentiment_id
                and corrected_sentiment_row.id != cls.sentiment_id
            )
            or (
                corrected_priority_row
                and cls.priority_id
                and corrected_priority_row.id != cls.priority_id
            )
        )
        if not changed:
            raise HTTPException(
                status_code=400,
                detail="At least one classification field must differ from LLM values",
            )
        if corrected_scenario_row:
            cls.scenario_id = corrected_scenario_row.id
        if corrected_sentiment_row:
            cls.sentiment_id = corrected_sentiment_row.id
        if corrected_priority_row:
            cls.priority_id = corrected_priority_row.id
        refs.sync_classification_legacy(
            cls,
            db.get(InteractionScenario, cls.scenario_id) if cls.scenario_id else None,
            db.get(SentimentProfile, cls.sentiment_id) if cls.sentiment_id else None,
            db.get(PriorityLevel, cls.priority_id) if cls.priority_id else None,
        )

    row = RejectionFeedback(
        review_id=review_id,
        operator_id=OPERATOR_PLACEHOLDER,
        rejection_reason=payload.rejection_reason,
        llm_scenario_id=llm_scenario_id,
        llm_sentiment_id=llm_sentiment_id,
        llm_priority_id=llm_priority_id,
        operator_corrected_scenario_id=(
            corrected_scenario_row.id if corrected_scenario_row else None
        ),
        operator_corrected_sentiment_id=(
            corrected_sentiment_row.id if corrected_sentiment_row else None
        ),
        operator_corrected_priority_id=(
            corrected_priority_row.id if corrected_priority_row else None
        ),
        optional_comment=(payload.optional_comment or "").strip() or None,
    )
    refs.sync_rejection_feedback_legacy(
        row,
        llm_scenario=llm_scenario_row,
        llm_sentiment=llm_sentiment_row,
        llm_priority=llm_priority_row,
        corrected_scenario=corrected_scenario_row,
        corrected_sentiment=corrected_sentiment_row,
        corrected_priority=corrected_priority_row,
    )
    db.add(row)
    db.flush()

    decision = get_current_decision(db, review_id)
    feedback_type = "classification_error"
    if payload.rejection_reason == "unsuitable_template":
        feedback_type = "wrong_response_text"
    elif payload.rejection_reason == "history_ignored":
        feedback_type = "wrong_policy"
    record_feedback(
        db,
        review_id=review_id,
        feedback_type=feedback_type,
        response_case_id=decision.response_case_id if decision else None,
        response_case_decision_id=decision.id if decision else None,
        rejection_reason=payload.rejection_reason,
        comment=payload.optional_comment,
        legacy_rejection_feedback_id=row.id,
    )

    resp = latest_response(review)
    if resp:
        resp.moderation_status = "needs_revision"
        resp.publication_status = "not_published"
        resp.operator_id = OPERATOR_PLACEHOLDER
        resp.updated_at = datetime.now(timezone.utc)

    log_event(
        db,
        event_type="ai_draft_rejected",
        entity_type="review",
        entity_id=review_id,
        status="ok",
        error_message=payload.optional_comment,
        metadata={
            "rejection_reason": payload.rejection_reason,
            "llm_scenario_id": str(cls.scenario_id) if cls.scenario_id else None,
            "llm_sentiment_id": str(cls.sentiment_id) if cls.sentiment_id else None,
            "llm_priority_id": str(cls.priority_id) if cls.priority_id else None,
            "operator_corrected_scenario_id": (
                str(corrected_scenario_row.id) if corrected_scenario_row else None
            ),
            "operator_corrected_sentiment_id": (
                str(corrected_sentiment_row.id) if corrected_sentiment_row else None
            ),
            "operator_corrected_priority_id": (
                str(corrected_priority_row.id) if corrected_priority_row else None
            ),
        },
    )
    db.commit()
    review = load_review_detail(db, review_id)
    return build_operator_detail(db, review)


def request_revision(db: Session, review_id: uuid.UUID, reason: str) -> ReviewResponse:
    start = time.perf_counter()
    resp = get_review_response_row(db, review_id)
    now = datetime.now(timezone.utc)
    resp.moderation_status = "needs_revision"
    resp.publication_status = "not_published"
    resp.operator_id = OPERATOR_PLACEHOLDER
    resp.updated_at = now

    log_event(
        db,
        event_type="moderation_revision_requested",
        entity_type="review",
        entity_id=review_id,
        latency_ms=int((time.perf_counter() - start) * 1000),
        status="ok",
        error_message=reason,
        metadata={"action": "revision"},
    )
    db.commit()
    return resp
