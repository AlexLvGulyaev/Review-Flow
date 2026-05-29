from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.response_case import (
    ProductAreaOut,
    ResponseCaseExampleOut,
    ResponseCaseListItem,
    ResponseCaseOut,
    ReviewTopicOut,
)


class ResponseCaseListItemAdmin(ResponseCaseListItem):
    examples_count: int = 0


class ResponseCaseCreate(BaseModel):
    case_code: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    scenario_id: UUID
    sentiment_id: UUID
    priority_id: UUID
    product_area_id: UUID
    topic_id: UUID
    response_policy: str = Field(..., min_length=1)
    approved_response_text: str = Field(..., min_length=1)
    confidence_threshold: Decimal = Field(default=Decimal("0.75"))
    review_policy: str = Field(default="operator_required")


class ResponseCaseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    scenario_id: UUID | None = None
    sentiment_id: UUID | None = None
    priority_id: UUID | None = None
    product_area_id: UUID | None = None
    topic_id: UUID | None = None
    response_policy: str | None = Field(None, min_length=1)
    approved_response_text: str | None = Field(None, min_length=1)
    confidence_threshold: Decimal | None = None
    review_policy: str | None = None
    is_active: bool | None = None


class ResponseCaseExampleCreate(BaseModel):
    example_text: str = Field(..., min_length=1)
    source: str = Field(default="admin_manual")


class ResponseCaseExampleUpdate(BaseModel):
    example_text: str | None = Field(None, min_length=1)
    is_active: bool | None = None


class ResponseCaseCandidateOut(BaseModel):
    id: UUID
    review_id: UUID
    status: str
    proposed_title: str | None = None
    proposed_description: str | None = None
    proposed_response_policy: str | None = None
    proposed_approved_response_text: str | None = None
    proposed_by_operator_id: str | None = None
    proposed_scenario_id: UUID | None = None
    proposed_sentiment_id: UUID | None = None
    proposed_priority_id: UUID | None = None
    proposed_product_area_id: UUID | None = None
    proposed_topic_id: UUID | None = None
    rejection_comment: str | None = None
    promoted_response_case_id: UUID | None = None
    merged_into_case_id: UUID | None = None
    created_at: str
    updated_at: str | None = None


class CandidatePromoteBody(BaseModel):
    merge_into_case_id: UUID | None = None


class CandidateRejectBody(BaseModel):
    rejection_comment: str | None = None


class ChCatalogOut(BaseModel):
    product_areas: list[ProductAreaOut]
    review_topics: list[ReviewTopicOut]
