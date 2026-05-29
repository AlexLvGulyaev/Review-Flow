from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.reference import ClassificationRefOut


class PhraseOut(BaseModel):
    id: UUID
    phrase_text: str
    scenario: ClassificationRefOut | None = None
    sentiment: ClassificationRefOut | None = None
    priority: ClassificationRefOut | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PhraseCreate(BaseModel):
    phrase_text: str = Field(..., min_length=1)
    scenario_id: UUID | None = None
    sentiment_id: UUID | None = None
    priority_id: UUID | None = None
    is_active: bool = True


class PhraseUpdate(BaseModel):
    phrase_text: str | None = None
    scenario_id: UUID | None = None
    sentiment_id: UUID | None = None
    priority_id: UUID | None = None
    is_active: bool | None = None


class TemplateOut(BaseModel):
    id: UUID
    title: str | None
    scenario: ClassificationRefOut | None = None
    sentiment: ClassificationRefOut | None = None
    priority: ClassificationRefOut | None = None
    template_text: str
    is_fallback: bool
    is_active: bool


class TemplateCreate(BaseModel):
    title: str = Field(..., min_length=1)
    scenario_id: UUID | None = None
    sentiment_id: UUID | None = None
    priority_id: UUID | None = None
    template_text: str = Field(..., min_length=1)
    is_fallback: bool = False
    is_active: bool = True


class TemplateUpdate(BaseModel):
    title: str | None = None
    scenario_id: UUID | None = None
    sentiment_id: UUID | None = None
    priority_id: UUID | None = None
    template_text: str | None = None
    is_fallback: bool | None = None
    is_active: bool | None = None


class ScenarioOut(BaseModel):
    id: UUID
    code: str
    title: str
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class ScenarioCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=1)
    description: str | None = None
    is_active: bool = True


class ScenarioUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_active: bool | None = None


class SentimentOut(BaseModel):
    id: UUID
    code: str
    title: str
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class SentimentCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=1)
    description: str | None = None
    is_active: bool = True


class SentimentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_active: bool | None = None
