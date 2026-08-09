from pydantic import BaseModel


class DistributionItem(BaseModel):
    label: str
    count: int


class ActivePromptItem(BaseModel):
    prompt_key: str
    version: int
    title: str


class AnalyticsOverview(BaseModel):
    total_reviews: int
    published_reviews: int
    pending_reviews: int
    rejected_reviews: int
    needs_revision_reviews: int
    average_rating: float | None
    ratings_distribution: list[DistributionItem]
    sentiment_distribution: list[DistributionItem]
    scenario_distribution: list[DistributionItem]
    priority_distribution: list[DistributionItem]
    active_prompt_versions: list[ActivePromptItem]
    evaluated_cases: int
    average_operator_score: float | None
    fallback_template_rate: float
    phrase_review_rate: float
