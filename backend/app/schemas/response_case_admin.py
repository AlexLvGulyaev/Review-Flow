from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.review import ClassificationOut
from app.schemas.response_case import (
    ProcessingPolicyOut,
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
    processing_policy_id: UUID | None = None


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
    processing_policy_id: UUID | None = None
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
    candidate_type: str = "new_response_case"
    target_response_case_id: UUID | None = None
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
    match_score: float | None = None
    retrieval_threshold: float | None = None
    gap: float | None = None
    created_at: str
    updated_at: str | None = None


class CandidatePromoteBody(BaseModel):
    merge_into_case_id: UUID | None = None


class CandidateRejectBody(BaseModel):
    rejection_comment: str | None = None


class CandidateCompleteBody(BaseModel):
    response_case_id: UUID


class CandidateReviewContextOut(BaseModel):
    review_id: UUID
    request_number: str | None = None
    order_number: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    service_case_title: str | None = None
    product_area: str | None = None
    rating: int | None = None
    review_text: str
    review_created_at: datetime
    operator_id: str | None = None
    candidate_created_at: datetime
    classification: ClassificationOut | None = None


class CandidateAnalysisOut(BaseModel):
    escalation_reason: str | None = None
    no_case_fits: bool = False
    target_case_id: UUID | None = None
    target_case_title: str | None = None
    target_case_code: str | None = None
    match_score: float | None = None
    retrieval_threshold: float | None = None
    gap: float | None = None
    confidence_band: str | None = None
    decision_source: str | None = None
    retrieval_summary: str | None = None
    system_selected_case_title: str | None = None
    system_selected_case_code: str | None = None


class CandidateRetrievalLineOut(BaseModel):
    match_score: float
    title: str
    description: str | None = None
    response_case_id: UUID | None = None
    rank: int = 0
    is_selected: bool = False


class CandidateTimelineEntryOut(BaseModel):
    event_type: str
    status: str | None = None
    error_message: str | None = None
    created_at: datetime


class ResponseCaseCandidateDetailOut(BaseModel):
    id: UUID
    review_id: UUID
    status: str
    candidate_type: str
    proposed_title: str | None = None
    target_response_case_id: UUID | None = None
    review: CandidateReviewContextOut
    analysis: CandidateAnalysisOut
    retrieval_alternatives: list[CandidateRetrievalLineOut] = Field(default_factory=list)
    operator_comment: str | None = None
    timeline: list[CandidateTimelineEntryOut] = Field(default_factory=list)
    technical_payload: dict = Field(default_factory=dict)
    prefill: dict = Field(default_factory=dict)


class ChCatalogOut(BaseModel):
    product_areas: list[ProductAreaOut]
    review_topics: list[ReviewTopicOut]
    processing_policies: list[ProcessingPolicyOut] = Field(default_factory=list)
