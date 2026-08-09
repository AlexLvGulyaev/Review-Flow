from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PromptListItem(BaseModel):
    id: UUID
    prompt_key: str
    version: int
    title: str
    is_active: bool
    created_at: datetime


class PromptDetail(BaseModel):
    id: UUID
    prompt_key: str
    version: int
    title: str
    system_prompt: str
    user_prompt_template: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PromptCreateRequest(BaseModel):
    prompt_key: str = Field(default="review_response_generation", max_length=128)
    title: str = Field(..., min_length=1, max_length=255)
    system_prompt: str = Field(..., min_length=1)
    user_prompt_template: str = Field(..., min_length=1)
