from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ReviewCreateRequest(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=255)
    email: str | None = Field(None, max_length=255)
    # legacy field kept for backward compatibility (will be mapped to order_number if order_number absent)
    service_case_title: str | None = Field(None, min_length=1, max_length=255)
    order_number: str = Field(..., min_length=1, max_length=64)
    product_area: str = Field(..., min_length=1, max_length=128)
    rating: int | None = Field(None, ge=1, le=5)
    review_text: str = Field(..., min_length=3)


class ReviewCreateResponse(BaseModel):
    review_id: UUID
    request_number: str
    status: str


class ClassificationOut(BaseModel):
    scenario: str | None
    sentiment: str | None
    priority: str | None
    topic: str | None
    product_area: str | None
    confidence: float | None
    classification_source: str | None
    phrase_match_score: float | None
    matched_phrase_text: str | None


class ReviewResponseOut(BaseModel):
    draft_response: str | None
    moderation_status: str
    publication_status: str


class ReviewDetailResponse(BaseModel):
    review_id: UUID
    status: str
    customer_name: str | None
    service_case_title: str | None
    product_area: str | None
    rating: int | None
    review_text: str
    created_at: datetime
    classification: ClassificationOut | None = None
    response: ReviewResponseOut | None = None


class ReviewStatusResponse(BaseModel):
    review_id: UUID
    request_number: str
    status: str
    moderation_status: str | None
    publication_status: str | None
    review_text: str
    rating: int | None
    product_area: str | None
    final_response: str | None = None
