from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.reference import ClassificationRefOut


class ProcessingPolicyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name_ru: str
    description: str | None = None
    is_active: bool


class ProductAreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    description: str | None = None
    is_active: bool


class ReviewTopicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    description: str | None = None
    product_area: ClassificationRefOut | None = None
    is_active: bool


class ResponseCaseExampleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    example_text: str
    source: str
    source_review_id: UUID | None = None
    is_active: bool
    created_at: datetime


class ResponseCaseListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_code: str
    title: str
    description: str | None = None
    scenario: ClassificationRefOut
    sentiment: ClassificationRefOut
    priority: ClassificationRefOut
    product_area: ProductAreaOut
    topic: ReviewTopicOut
    confidence_threshold: Decimal
    processing_policy_id: UUID
    processing_policy: ProcessingPolicyOut
    review_policy: str
    is_active: bool
    updated_at: datetime


class ResponseCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_code: str
    title: str
    description: str | None = None
    scenario: ClassificationRefOut
    sentiment: ClassificationRefOut
    priority: ClassificationRefOut
    product_area: ProductAreaOut
    topic: ReviewTopicOut
    response_policy: str
    approved_response_text: str
    confidence_threshold: Decimal
    processing_policy_id: UUID
    processing_policy: ProcessingPolicyOut
    review_policy: str
    is_active: bool
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime
    examples: list[ResponseCaseExampleOut] = Field(default_factory=list)
