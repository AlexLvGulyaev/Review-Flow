from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PhraseOut(BaseModel):
    id: UUID
    phrase_text: str
    scenario: str | None
    sentiment: str | None
    priority: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PhraseCreate(BaseModel):
    phrase_text: str = Field(..., min_length=1)
    scenario: str | None = None
    sentiment: str | None = None
    priority: str | None = None
    is_active: bool = True


class PhraseUpdate(BaseModel):
    phrase_text: str | None = None
    scenario: str | None = None
    sentiment: str | None = None
    priority: str | None = None
    is_active: bool | None = None


class TemplateOut(BaseModel):
    id: UUID
    title: str | None
    scenario: str | None
    sentiment: str | None
    priority: str | None
    template_text: str
    is_fallback: bool
    is_active: bool

    model_config = {"from_attributes": True}


class TemplateCreate(BaseModel):
    title: str = Field(..., min_length=1)
    scenario: str | None = None
    sentiment: str | None = None
    priority: str | None = None
    template_text: str = Field(..., min_length=1)
    is_fallback: bool = False
    is_active: bool = True


class TemplateUpdate(BaseModel):
    title: str | None = None
    scenario: str | None = None
    sentiment: str | None = None
    priority: str | None = None
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
