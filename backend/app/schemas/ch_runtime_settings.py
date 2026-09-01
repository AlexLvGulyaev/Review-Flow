from datetime import datetime

from pydantic import BaseModel, Field


class ChRuntimeSettingsOut(BaseModel):
    retrieval_top_n: int = Field(ge=1, le=20)
    minimum_match_score: float = Field(ge=0, le=1)
    confidence_medium_delta: float = Field(ge=0, le=1)
    default_confidence_threshold: float = Field(ge=0, le=1)
    draft_on_medium: bool
    auto_decision_on_high: bool
    confidence_score_floor: float = Field(ge=0, le=1)
    confidence_gap_high: float = Field(ge=0, le=1)
    retrieval_algorithm_label: str = "Сопоставление с примерами типовых ситуаций"
    updated_at: datetime | None = None


class ChRuntimeSettingsPatch(BaseModel):
    retrieval_top_n: int | None = Field(None, ge=1, le=20)
    minimum_match_score: float | None = Field(None, ge=0, le=1)
    confidence_medium_delta: float | None = Field(None, ge=0, le=1)
    default_confidence_threshold: float | None = Field(None, ge=0, le=1)
    draft_on_medium: bool | None = None
    auto_decision_on_high: bool | None = None
    confidence_score_floor: float | None = Field(None, ge=0, le=1)
    confidence_gap_high: float | None = Field(None, ge=0, le=1)