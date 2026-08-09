from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CountItem(BaseModel):
    label: str
    count: int


class ChOverviewMetrics(BaseModel):
    total_decisions: int = 0
    total_matched_cases: int = 0
    total_low_confidence: int = 0
    total_overrides: int = 0
    total_candidates: int = 0
    approved_candidates: int = 0
    rejected_candidates: int = 0
    period_days: int = 30


class ConfidenceBreakdown(BaseModel):
    high: int = 0
    medium: int = 0
    low: int = 0
    total: int = 0


class ConfidenceAnalytics(BaseModel):
    overall: ConfidenceBreakdown
    by_product_area: list[CountItem] = Field(default_factory=list)
    by_topic: list[CountItem] = Field(default_factory=list)


class OverrideCaseStat(BaseModel):
    case_id: UUID
    case_code: str
    title: str
    override_count: int


class OverrideReasonStat(BaseModel):
    reason: str
    count: int
    sample_comment: str | None = None


class OverrideAnalytics(BaseModel):
    override_count: int = 0
    override_percent: float = 0.0
    top_overridden_cases: list[OverrideCaseStat] = Field(default_factory=list)
    reasons: list[OverrideReasonStat] = Field(default_factory=list)


class CandidateAnalytics(BaseModel):
    by_status: list[CountItem] = Field(default_factory=list)
    by_product_area: list[CountItem] = Field(default_factory=list)
    by_topic: list[CountItem] = Field(default_factory=list)


class ResponseCaseQualityRow(BaseModel):
    case_id: UUID
    case_code: str
    title: str
    product_area: str
    topic: str
    is_active: bool
    hit_count: int = 0
    override_count: int = 0
    feedback_count: int = 0
    candidate_count: int = 0
    problem_score: int = 0


class RetrievalMissRow(BaseModel):
    review_id: UUID
    request_number: str | None = None
    miss_type: str
    detail: str | None = None
    confidence_band: str | None = None
    created_at: datetime
    product_area: str | None = None
    topic: str | None = None


class KbHealthMetrics(BaseModel):
    active_cases: int = 0
    archived_cases: int = 0
    coverage_percent: float = 0.0
    candidate_backlog: int = 0
    approval_rate_percent: float | None = None
    total_examples: int = 0
    reviews_with_ch_decision: int = 0
    total_reviews: int = 0


class ChAuditEntry(BaseModel):
    id: UUID
    event_type: str
    entity_type: str | None = None
    entity_id: UUID | None = None
    status: str | None = None
    created_at: datetime
    metadata: dict = Field(default_factory=dict)


class ChAnalyticsDashboard(BaseModel):
    overview: ChOverviewMetrics
    confidence: ConfidenceAnalytics
    overrides: OverrideAnalytics
    candidates: CandidateAnalytics
    case_quality: list[ResponseCaseQualityRow] = Field(default_factory=list)
    retrieval_misses: list[RetrievalMissRow] = Field(default_factory=list)
    kb_health: KbHealthMetrics


class ChAuditTrail(BaseModel):
    items: list[ChAuditEntry] = Field(default_factory=list)
    period_days: int = 30
