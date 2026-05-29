import time
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import (
    OperationalLog,
    RejectionFeedback,
    Review,
    ReviewClassification,
    ReviewResponse,
)
from app.schemas.operator import (
    ClassificationOut,
    OperatorReviewDetail,
    OperationalLogOut,
    RejectionFeedbackOut,
    TemplateOut,
)
from app.services.review_ids import customer_display_request_number
from app.services.operational_log import log_event
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


def _feedback_out(row: RejectionFeedback) -> RejectionFeedbackOut:
    return RejectionFeedbackOut(
        id=row.id,
        rejection_reason=row.rejection_reason,
        llm_scenario=row.llm_scenario,
        llm_tone=row.llm_tone,
        llm_priority=row.llm_priority,
        operator_corrected_scenario=row.operator_corrected_scenario,
        operator_corrected_tone=row.operator_corrected_tone,
        operator_corrected_priority=row.operator_corrected_priority,
        optional_comment=row.optional_comment,
        created_at=row.created_at,
    )


def _classification_out(review: Review) -> ClassificationOut | None:
    cls = latest_classification(review)
    if not cls:
        return None
    matched_text = cls.matched_phrase.phrase_text if cls.matched_phrase else None
    return ClassificationOut(
        scenario=cls.scenario,
        sentiment=cls.sentiment,
        priority=cls.priority,
        topic=cls.topic,
        product_area=cls.product_area,
        confidence=float(cls.confidence) if cls.confidence else None,
        classification_source=cls.classification_source,
        phrase_match_score=float(cls.phrase_match_score) if cls.phrase_match_score else None,
        matched_phrase_text=matched_text,
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
    if resp and resp.template:
        template_out = TemplateOut(
            template_id=resp.template.id,
            template_text=resp.template.template_text,
            title=resp.template.title,
            scenario=resp.template.scenario,
            sentiment=resp.template.sentiment,
            priority=resp.template.priority,
        )

    feedback_rows = db.scalars(
        select(RejectionFeedback)
        .where(RejectionFeedback.review_id == review.id)
        .order_by(RejectionFeedback.created_at.asc())
    ).all()
    feedback_history = [_feedback_out(f) for f in feedback_rows]
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
    if resp and isinstance(resp.generation_metadata, dict):
        llm_model = resp.generation_metadata.get("model") or resp.generation_metadata.get("model_name")

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
        classification=_classification_out(review),
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

    llm_scenario = cls.scenario
    llm_tone = cls.sentiment
    llm_priority = cls.priority

    if payload.rejection_reason == "classification_error":
        corrected = [
            payload.operator_corrected_scenario,
            payload.operator_corrected_tone,
            payload.operator_corrected_priority,
        ]
        if not any(corrected):
            raise HTTPException(
                status_code=400,
                detail="Corrected scenario, tone, or priority required",
            )
        changed = (
            (payload.operator_corrected_scenario and payload.operator_corrected_scenario != llm_scenario)
            or (payload.operator_corrected_tone and payload.operator_corrected_tone != llm_tone)
            or (payload.operator_corrected_priority and payload.operator_corrected_priority != llm_priority)
        )
        if not changed:
            raise HTTPException(
                status_code=400,
                detail="At least one classification field must differ from LLM values",
            )
        if payload.operator_corrected_scenario:
            cls.scenario = payload.operator_corrected_scenario
        if payload.operator_corrected_tone:
            cls.sentiment = payload.operator_corrected_tone
        if payload.operator_corrected_priority:
            cls.priority = payload.operator_corrected_priority

    row = RejectionFeedback(
        review_id=review_id,
        operator_id=OPERATOR_PLACEHOLDER,
        rejection_reason=payload.rejection_reason,
        llm_scenario=llm_scenario,
        llm_tone=llm_tone,
        llm_priority=llm_priority,
        operator_corrected_scenario=payload.operator_corrected_scenario,
        operator_corrected_tone=payload.operator_corrected_tone,
        operator_corrected_priority=payload.operator_corrected_priority,
        optional_comment=(payload.optional_comment or "").strip() or None,
    )
    db.add(row)

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
            "llm_scenario": llm_scenario,
            "llm_tone": llm_tone,
            "llm_priority": llm_priority,
            "operator_corrected_scenario": payload.operator_corrected_scenario,
            "operator_corrected_tone": payload.operator_corrected_tone,
            "operator_corrected_priority": payload.operator_corrected_priority,
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
