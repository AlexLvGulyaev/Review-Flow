from datetime import datetime

from pydantic import BaseModel, Field


class ReportPeriodMeta(BaseModel):
    period: str
    date_from: datetime
    date_to: datetime


class ReportDistributionItem(BaseModel):
    label: str
    count: int


class ReportTimeSeriesItem(BaseModel):
    label: str
    count: int


class ReportTableRow(BaseModel):
    label: str
    count: int
    share: float


class CustomerReviewsExportBundle(BaseModel):
    """Stable structure for future PDF / Excel / CSV export."""

    period: ReportPeriodMeta
    kpis: dict = Field(default_factory=dict)
    reviews_by_day: list[ReportTimeSeriesItem] = Field(default_factory=list)
    by_product_area: list[ReportDistributionItem] = Field(default_factory=list)
    by_topics: list[ReportDistributionItem] = Field(default_factory=list)
    by_scenario: list[ReportDistributionItem] = Field(default_factory=list)
    by_sentiment: list[ReportDistributionItem] = Field(default_factory=list)
    by_priority: list[ReportDistributionItem] = Field(default_factory=list)
    top_topics: list[ReportTableRow] = Field(default_factory=list)


class CustomerReviewsReport(BaseModel):
    period: ReportPeriodMeta
    total_reviews: int = 0
    processed_reviews: int = 0
    in_progress_reviews: int = 0
    average_rating: float | None = None
    average_processing_hours: float | None = None
    reviews_by_day: list[ReportTimeSeriesItem] = Field(default_factory=list)
    by_product_area: list[ReportDistributionItem] = Field(default_factory=list)
    by_scenario: list[ReportDistributionItem] = Field(default_factory=list)
    by_sentiment: list[ReportDistributionItem] = Field(default_factory=list)
    by_priority: list[ReportDistributionItem] = Field(default_factory=list)
    top_topics: list[ReportTableRow] = Field(default_factory=list)
    export_bundle: CustomerReviewsExportBundle
    summary: str = ""


class BusinessProblemsReport(BaseModel):
    period: ReportPeriodMeta
    top_complaints: list[ReportTableRow] = Field(default_factory=list)
    top_suggestions: list[ReportTableRow] = Field(default_factory=list)
    top_gratitude: list[ReportTableRow] = Field(default_factory=list)
    new_topics: list[ReportTableRow] = Field(default_factory=list)
    summary: str = ""


class ChQualityReport(BaseModel):
    period: ReportPeriodMeta
    coverage_pct: float = 0.0
    override_rate_pct: float = 0.0
    low_confidence_rate_pct: float = 0.0
    new_cases: int = 0
    new_examples: int = 0
    candidates_created: int = 0
    coverage_by_day: list[ReportTimeSeriesItem] = Field(default_factory=list)
    override_by_day: list[ReportTimeSeriesItem] = Field(default_factory=list)
    low_confidence_by_day: list[ReportTimeSeriesItem] = Field(default_factory=list)
    problematic_cases: list[ReportTableRow] = Field(default_factory=list)
    problematic_cases_title: str = "Часто переопределяемые типовые ситуации"
    problematic_cases_criterion: str = (
        "ТС, по которым оператор чаще всего менял автоматический выбор "
        "(текущее решение с is_operator_override=true)."
    )
    summary: str = ""
