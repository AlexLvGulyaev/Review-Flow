from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class EvaluationCaseCreate(BaseModel):
    review_id: UUID
    expected_quality_notes: str | None = None


class EvaluationScoreUpdate(BaseModel):
    operator_score: int = Field(..., ge=1, le=5)
    operator_comment: str | None = None


class EvaluationCaseOut(BaseModel):
    id: UUID
    review_id: UUID
    review_text: str | None = None
    draft_response: str | None = None
    final_response: str | None = None
    prompt_key: str | None = None
    prompt_version: int | None = None
    prompt_version_id: UUID | None = None
    expected_quality_notes: str | None = None
    operator_score: int | None = None
    operator_comment: str | None = None
    created_at: datetime
    updated_at: datetime
