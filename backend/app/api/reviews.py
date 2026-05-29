from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.entities import Review, ReviewClassification
from app.schemas.review import (
    ReviewCreateRequest,
    ReviewCreateResponse,
    ReviewDetailResponse,
    ReviewResponseOut,
    ReviewStatusResponse,
)
from app.services.classification_out import build_classification_out
from app.services.pipeline import ReviewPipeline
from app.services.review_helpers import latest_classification, latest_response
from app.services.review_ids import (
    customer_display_request_number,
    resolve_review_by_request_ref,
)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=ReviewCreateResponse, status_code=201)
def create_review(
    payload: ReviewCreateRequest,
    db: Session = Depends(get_db),
) -> ReviewCreateResponse:
    pipeline = ReviewPipeline(db)
    review_id, status = pipeline.ingest_and_process(payload)
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=500, detail="Review not created")
    request_number = customer_display_request_number(
        review.request_number,
        review.order_number,
        review.request_sequence,
    )
    return ReviewCreateResponse(review_id=review_id, request_number=request_number, status=status)


@router.get("/requests/{request_number}/status", response_model=ReviewStatusResponse)
def get_request_status(
    request_number: str,
    email: str = Query(...),
    db: Session = Depends(get_db),
) -> ReviewStatusResponse:
    review = resolve_review_by_request_ref(db, request_number)
    if not review:
        raise HTTPException(status_code=404, detail="Обращение не найдено")
    review = (
        db.query(Review)
        .options(joinedload(Review.responses), joinedload(Review.customer))
        .filter(Review.id == review.id)
        .first()
    )

    actual = (review.customer.email or "").strip().lower() if review.customer else ""
    requested = email.strip().lower()
    if not actual or actual != requested:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    # reuse existing logic by calling the UUID-based function body inline
    resp = latest_response(review)
    moderation_status = resp.moderation_status if resp else None
    publication_status = resp.publication_status if resp else None

    if publication_status == "published" and resp and resp.final_response:
        client_status = "published"
    elif moderation_status == "rejected":
        client_status = "rejected"
    elif moderation_status == "needs_revision":
        client_status = "needs_revision"
    elif moderation_status == "pending_review":
        client_status = "pending_review"
    elif moderation_status == "approved":
        client_status = "approved"
    else:
        client_status = "processing"

    final_response = None
    if publication_status == "published" and resp:
        final_response = resp.final_response

    display_id = customer_display_request_number(
        review.request_number,
        review.order_number,
        review.request_sequence,
    )
    return ReviewStatusResponse(
        review_id=review.id,
        request_number=display_id or request_number,
        status=client_status,
        moderation_status=moderation_status,
        publication_status=publication_status,
        review_text=review.review_text,
        rating=review.rating,
        product_area=review.product_area,
        final_response=final_response,
    )


@router.get("/{review_id}/status", response_model=ReviewStatusResponse)
def get_review_status(
    review_id: UUID,
    email: str | None = Query(None),
    db: Session = Depends(get_db),
) -> ReviewStatusResponse:
    review = (
        db.query(Review)
        .options(joinedload(Review.responses), joinedload(Review.customer))
        .filter(Review.id == review_id)
        .first()
    )
    if not review:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    if email:
        actual = (review.customer.email or "").strip().lower() if review.customer else ""
        requested = email.strip().lower()
        if not actual or actual != requested:
            raise HTTPException(status_code=404, detail="Обращение не найдено")

    resp = latest_response(review)
    moderation_status = resp.moderation_status if resp else None
    publication_status = resp.publication_status if resp else None

    if publication_status == "published" and resp and resp.final_response:
        client_status = "published"
    elif moderation_status == "rejected":
        client_status = "rejected"
    elif moderation_status == "needs_revision":
        client_status = "needs_revision"
    elif moderation_status == "pending_review":
        client_status = "pending_review"
    elif moderation_status == "approved":
        client_status = "approved"
    else:
        client_status = "processing"

    final_response = None
    if publication_status == "published" and resp:
        final_response = resp.final_response

    display_id = customer_display_request_number(
        review.request_number,
        review.order_number,
        review.request_sequence,
    )
    return ReviewStatusResponse(
        review_id=review.id,
        request_number=display_id,
        status=client_status,
        moderation_status=moderation_status,
        publication_status=publication_status,
        review_text=review.review_text,
        rating=review.rating,
        product_area=review.product_area,
        final_response=final_response,
    )


@router.get("/{review_id}", response_model=ReviewDetailResponse)
def get_review(review_id: UUID, db: Session = Depends(get_db)) -> ReviewDetailResponse:
    review = (
        db.query(Review)
        .options(
            joinedload(Review.customer),
            joinedload(Review.service_case),
            joinedload(Review.classifications).joinedload(ReviewClassification.matched_phrase),
            joinedload(Review.responses),
        )
        .filter(Review.id == review_id)
        .first()
    )
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    status = "processing"
    classification_out = None
    response_out = None

    resp = latest_response(review)
    if resp:
        status = resp.moderation_status
        response_out = ReviewResponseOut(
            draft_response=resp.draft_response,
            moderation_status=resp.moderation_status,
            publication_status=resp.publication_status,
        )

    cls = latest_classification(review)
    if cls:
        matched_text = cls.matched_phrase.phrase_text if cls.matched_phrase else None
        classification_out = build_classification_out(
            db, cls, matched_phrase_text=matched_text
        )
        if not resp:
            status = "processing"

    return ReviewDetailResponse(
        review_id=review.id,
        status=status,
        customer_name=review.customer.customer_name if review.customer else None,
        service_case_title=review.service_case.case_title if review.service_case else None,
        product_area=review.product_area,
        rating=review.rating,
        review_text=review.review_text,
        created_at=review.created_at,
        classification=classification_out,
        response=response_out,
    )
