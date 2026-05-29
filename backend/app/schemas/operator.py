from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.reference import ClassificationRefOut
from app.schemas.review import ClassificationOut


class ApproveRequest(BaseModel):
    final_response: str = Field(..., min_length=1)


class ModerationActionRequest(BaseModel):
    reason: str = Field(..., min_length=1)


class ModerationActionResponse(BaseModel):
    review_id: UUID
    moderation_status: str
    publication_status: str
    message: str


class OperationalLogOut(BaseModel):
    event_type: str
    status: str | None
    error_message: str | None
    created_at: datetime


class OperatorReviewListItem(BaseModel):
    review_id: UUID
    request_number: str | None = None
    customer_name: str | None
    service_case_title: str | None
    product_area: str | None
    rating: int | None
    review_text_preview: str
    scenario: str | None
    sentiment: str | None
    priority: str | None
    moderation_status: str | None
    publication_status: str | None
    created_at: datetime
    updated_at: datetime | None


class TemplateOut(BaseModel):
    template_id: UUID | None
    template_text: str | None
    title: str | None = None
    scenario: ClassificationRefOut | None = None
    sentiment: ClassificationRefOut | None = None
    priority: ClassificationRefOut | None = None


class RejectionFeedbackOut(BaseModel):
    id: UUID
    rejection_reason: str
    llm_scenario: ClassificationRefOut | None = None
    llm_sentiment: ClassificationRefOut | None = None
    llm_priority: ClassificationRefOut | None = None
    operator_corrected_scenario: ClassificationRefOut | None = None
    operator_corrected_sentiment: ClassificationRefOut | None = None
    operator_corrected_priority: ClassificationRefOut | None = None
    optional_comment: str | None
    created_at: datetime


class RejectionFeedbackRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=1)
    operator_corrected_scenario_id: UUID | None = None
    operator_corrected_sentiment_id: UUID | None = None
    operator_corrected_priority_id: UUID | None = None
    optional_comment: str | None = None


class ResponseCaseAlternativeOut(BaseModel):
    response_case_id: UUID
    case_code: str
    title: str
    description: str | None = None
    match_score: float
    rank: int
    is_selected: bool = False


class SelectedResponseCaseOut(BaseModel):
    response_case_id: UUID
    case_code: str
    title: str
    description: str | None = None
    product_area: ClassificationRefOut | None = None
    topic: ClassificationRefOut | None = None
    match_confidence: float | None = None
    confidence_band: str | None = None
    decision_source: str | None = None
    is_operator_override: bool = False
    requires_operator_confirmation: bool = False
    operator_confirmed: bool = False
    response_policy: str | None = None
    approved_response_text: str | None = None
    review_policy: str | None = None
    scenario: ClassificationRefOut | None = None
    sentiment: ClassificationRefOut | None = None
    priority: ClassificationRefOut | None = None


class ResponseCaseOverrideRequest(BaseModel):
    response_case_id: UUID
    comment: str | None = None


class CaseCandidateCreateRequest(BaseModel):
    proposed_title: str = Field(..., min_length=1)
    proposed_description: str = Field(..., min_length=1)
    operator_comment: str | None = None
    proposed_scenario_id: UUID | None = None
    proposed_sentiment_id: UUID | None = None
    proposed_priority_id: UUID | None = None
    proposed_product_area_id: UUID | None = None
    proposed_topic_id: UUID | None = None
    proposed_response_policy: str | None = None
    proposed_approved_response_text: str | None = None


class OperatorReviewDetail(BaseModel):
    review_id: UUID
    request_number: str | None = None
    order_number: str | None = None
    customer_name: str | None
    customer_email: str | None
    service_case_title: str | None
    product_area: str | None
    rating: int | None
    review_text: str
    created_at: datetime
    classification: ClassificationOut | None
    matched_phrase_text: str | None
    template: TemplateOut | None
    draft_response: str | None
    final_response: str | None
    moderation_status: str | None
    publication_status: str | None
    operational_logs: list[OperationalLogOut] = []
    updated_at: datetime | None = None
    llm_model: str | None = None
    ai_review_mode: str = "review"
    latest_rejection_feedback: RejectionFeedbackOut | None = None
    rejection_feedback_history: list[RejectionFeedbackOut] = []
    pipeline_mode: str = "legacy"
    selected_response_case: SelectedResponseCaseOut | None = None
    case_alternatives: list[ResponseCaseAlternativeOut] = Field(default_factory=list)
