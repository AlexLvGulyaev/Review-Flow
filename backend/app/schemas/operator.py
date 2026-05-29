from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

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
    scenario: str | None
    sentiment: str | None
    priority: str | None


class RejectionFeedbackOut(BaseModel):
    id: UUID
    rejection_reason: str
    llm_scenario: str | None
    llm_tone: str | None
    llm_priority: str | None
    operator_corrected_scenario: str | None
    operator_corrected_tone: str | None
    operator_corrected_priority: str | None
    optional_comment: str | None
    created_at: datetime


class RejectionFeedbackRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=1)
    llm_scenario: str | None = None
    llm_tone: str | None = None
    llm_priority: str | None = None
    operator_corrected_scenario: str | None = None
    operator_corrected_tone: str | None = None
    operator_corrected_priority: str | None = None
    optional_comment: str | None = None


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
