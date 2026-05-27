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
    scenario: str | None
    sentiment: str | None
    priority: str | None


class OperatorReviewDetail(BaseModel):
    review_id: UUID
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
