from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.core.roles import Role, require_operator, require_ops_read
from sqlalchemy.orm import Session, joinedload

from app.api.audit_helpers import audit
from app.db.session import get_db
from app.models.entities import Review, ReviewClassification, ReviewResponse
from app.schemas.operator import (
    ApproveRequest,
    CaseCandidateCreateRequest,
    ModerationActionRequest,
    ModerationActionResponse,
    OperatorEscalationRequest,
    OperatorReviewDetail,
    OperatorReviewListItem,
    RejectionFeedbackRequest,
    ResponseCaseOverrideRequest,
)
from app.services.controlled_hybrid.operator_case import (
    confirm_response_case,
    create_case_candidate,
    escalate_response_case,
    override_response_case,
)
from app.services.moderation import (
    _display_request_number,
    approve_review,
    build_operator_detail,
    load_review_detail,
    reject_review,
    request_revision,
    submit_ai_draft_rejection_feedback,
)
from app.services.classification_refs import ClassificationRefsService
from app.services.controlled_hybrid.presenter import resolve_operator_list_classification
from app.services.review_helpers import latest_response, review_text_preview

router = APIRouter(
    prefix="/api/operator/reviews",
    tags=["operator"],
    dependencies=[Depends(require_ops_read)],
)


def _to_list_item(review: Review, refs: ClassificationRefsService, db: Session) -> OperatorReviewListItem:
    resp = latest_response(review)
    scenario_code, sentiment_code, priority_code = resolve_operator_list_classification(
        db, review, resp, refs
    )
    return OperatorReviewListItem(
        review_id=review.id,
        request_number=_display_request_number(review),
        customer_name=review.customer.customer_name if review.customer else None,
        service_case_title=review.service_case.case_title if review.service_case else None,
        product_area=review.product_area,
        rating=review.rating,
        review_text_preview=review_text_preview(review.review_text),
        scenario=scenario_code,
        sentiment=sentiment_code,
        priority=priority_code,
        moderation_status=resp.moderation_status if resp else None,
        publication_status=resp.publication_status if resp else None,
        created_at=review.created_at,
        updated_at=resp.updated_at if resp else None,
    )


@router.get("", response_model=list[OperatorReviewListItem])
def list_operator_reviews(
    moderation_status: str | None = Query(None),
    publication_status: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[OperatorReviewListItem]:
    query = (
        db.query(Review)
        .options(
            joinedload(Review.customer),
            joinedload(Review.service_case),
            joinedload(Review.classifications),
            joinedload(Review.responses),
        )
        .order_by(Review.created_at.desc())
    )

    reviews = query.limit(100).all()
    refs = ClassificationRefsService(db)
    items = [_to_list_item(r, refs, db) for r in reviews]

    if moderation_status:
        items = [i for i in items if i.moderation_status == moderation_status]
    if publication_status:
        items = [i for i in items if i.publication_status == publication_status]

    return items


@router.get("/{review_id}", response_model=OperatorReviewDetail)
def get_operator_review(
    review_id: UUID,
    db: Session = Depends(get_db),
) -> OperatorReviewDetail:
    review = load_review_detail(db, review_id)
    detail = build_operator_detail(db, review)
    db.commit()
    return detail


@router.post("/{review_id}/approve", response_model=OperatorReviewDetail, dependencies=[Depends(require_operator)])
def approve_operator_review(
    review_id: UUID,
    payload: ApproveRequest,
    request: Request,
    role: Role = Depends(require_operator),
    db: Session = Depends(get_db),
) -> OperatorReviewDetail:
    audit(request, role, "moderation_approved", resource_type="review", resource_id=review_id, db=db)
    return approve_review(db, review_id, payload.final_response)


@router.post("/{review_id}/reject", response_model=ModerationActionResponse, dependencies=[Depends(require_operator)])
def reject_operator_review(
    review_id: UUID,
    payload: ModerationActionRequest,
    request: Request,
    role: Role = Depends(require_operator),
    db: Session = Depends(get_db),
) -> ModerationActionResponse:
    audit(
        request, role, "moderation_rejected", resource_type="review", resource_id=review_id,
        db=db, details={"reason": (payload.reason or "")[:512]} if payload.reason else None,
    )
    resp = reject_review(db, review_id, payload.reason)
    return ModerationActionResponse(
        review_id=review_id,
        moderation_status=resp.moderation_status,
        publication_status=resp.publication_status,
        message="Review rejected",
    )


@router.post("/{review_id}/reject-feedback", response_model=OperatorReviewDetail, dependencies=[Depends(require_operator)])
def reject_feedback_operator_review(
    review_id: UUID,
    payload: RejectionFeedbackRequest,
    request: Request,
    role: Role = Depends(require_operator),
    db: Session = Depends(get_db),
) -> OperatorReviewDetail:
    audit(request, role, "ai_draft_rejection_feedback", resource_type="review", resource_id=review_id, db=db)
    return submit_ai_draft_rejection_feedback(db, review_id, payload)


@router.post("/{review_id}/confirm-case", response_model=OperatorReviewDetail, dependencies=[Depends(require_operator)])
def confirm_case_operator_review(
    review_id: UUID,
    request: Request,
    role: Role = Depends(require_operator),
    db: Session = Depends(get_db),
) -> OperatorReviewDetail:
    audit(request, role, "operator_case_confirmed", resource_type="review", resource_id=review_id, db=db)
    return confirm_response_case(db, review_id)


@router.post("/{review_id}/override-case", response_model=OperatorReviewDetail, dependencies=[Depends(require_operator)])
def override_case_operator_review(
    review_id: UUID,
    payload: ResponseCaseOverrideRequest,
    request: Request,
    role: Role = Depends(require_operator),
    db: Session = Depends(get_db),
) -> OperatorReviewDetail:
    audit(
        request, role, "operator_case_override", resource_type="review", resource_id=review_id,
        db=db,
        details={"response_case_id": str(payload.response_case_id)},
    )
    return override_response_case(db, review_id, payload)


@router.post("/{review_id}/case-candidates", response_model=OperatorReviewDetail, dependencies=[Depends(require_operator)])
def create_case_candidate_operator_review(
    review_id: UUID,
    payload: CaseCandidateCreateRequest,
    request: Request,
    role: Role = Depends(require_operator),
    db: Session = Depends(get_db),
) -> OperatorReviewDetail:
    audit(request, role, "case_candidate_created", resource_type="review", resource_id=review_id, db=db)
    return create_case_candidate(db, review_id, payload)


@router.post("/{review_id}/escalate", response_model=OperatorReviewDetail, dependencies=[Depends(require_operator)])
def escalate_operator_review(
    review_id: UUID,
    payload: OperatorEscalationRequest,
    request: Request,
    role: Role = Depends(require_operator),
    db: Session = Depends(get_db),
) -> OperatorReviewDetail:
    audit(
        request, role, "operator_case_escalated", resource_type="review", resource_id=review_id,
        db=db,
        details={"escalation_reason": (payload.escalation_reason or "")[:512]},
    )
    return escalate_response_case(db, review_id, payload)


@router.post("/{review_id}/revision", response_model=ModerationActionResponse, dependencies=[Depends(require_operator)])
def revision_operator_review(
    review_id: UUID,
    payload: ModerationActionRequest,
    request: Request,
    role: Role = Depends(require_operator),
    db: Session = Depends(get_db),
) -> ModerationActionResponse:
    audit(
        request, role, "moderation_revision_requested", resource_type="review", resource_id=review_id,
        db=db, details={"reason": (payload.reason or "")[:512]} if payload.reason else None,
    )
    resp = request_revision(db, review_id, payload.reason)
    return ModerationActionResponse(
        review_id=review_id,
        moderation_status=resp.moderation_status,
        publication_status=resp.publication_status,
        message="Revision requested",
    )
