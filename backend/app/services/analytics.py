from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import (
    EvaluationCase,
    PromptVersion,
    Review,
    ReviewClassification,
    ReviewResponse,
)
from app.schemas.analytics import ActivePromptItem, AnalyticsOverview, DistributionItem


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_overview(self) -> AnalyticsOverview:
        total_reviews = self.db.scalar(select(func.count(Review.id))) or 0

        published = self._count_responses_by_status("approved", "published")
        pending = self._count_responses_by_moderation("pending_review")
        rejected = self._count_responses_by_moderation("rejected")
        needs_revision = self._count_responses_by_moderation("needs_revision")

        avg_rating = self.db.scalar(select(func.avg(Review.rating)))
        ratings_dist = self._distribution(
            select(Review.rating, func.count(Review.id))
            .where(Review.rating.isnot(None))
            .group_by(Review.rating)
            .order_by(Review.rating)
        )

        sentiment_dist = self._distribution(
            select(ReviewClassification.sentiment, func.count(ReviewClassification.id))
            .where(ReviewClassification.sentiment.isnot(None))
            .group_by(ReviewClassification.sentiment)
        )
        scenario_dist = self._distribution(
            select(ReviewClassification.scenario, func.count(ReviewClassification.id))
            .where(ReviewClassification.scenario.isnot(None))
            .group_by(ReviewClassification.scenario)
        )
        priority_dist = self._distribution(
            select(ReviewClassification.priority, func.count(ReviewClassification.id))
            .where(ReviewClassification.priority.isnot(None))
            .group_by(ReviewClassification.priority)
        )

        active_prompts = self.db.scalars(
            select(PromptVersion).where(PromptVersion.is_active.is_(True))
        ).all()
        active_items = [
            ActivePromptItem(
                prompt_key=p.prompt_key,
                version=p.version,
                title=p.title,
            )
            for p in active_prompts
        ]

        evaluated_cases = self.db.scalar(select(func.count(EvaluationCase.id))) or 0
        avg_score = self.db.scalar(
            select(func.avg(EvaluationCase.operator_score)).where(
                EvaluationCase.operator_score.isnot(None)
            )
        )

        total_cls = self.db.scalar(select(func.count(ReviewClassification.id))) or 0
        fallback_count = self.db.scalar(
            select(func.count(ReviewClassification.id)).where(
                ReviewClassification.classification_source == "llm_fallback"
            )
        ) or 0
        phrase_review_count = self.db.scalar(
            select(func.count(ReviewClassification.id)).where(
                ReviewClassification.needs_phrase_review.is_(True)
            )
        ) or 0

        fallback_rate = (fallback_count / total_cls) if total_cls else 0.0
        phrase_rate = (phrase_review_count / total_cls) if total_cls else 0.0

        return AnalyticsOverview(
            total_reviews=total_reviews,
            published_reviews=published,
            pending_reviews=pending,
            rejected_reviews=rejected,
            needs_revision_reviews=needs_revision,
            average_rating=round(float(avg_rating), 2) if avg_rating is not None else None,
            ratings_distribution=ratings_dist,
            sentiment_distribution=sentiment_dist,
            scenario_distribution=scenario_dist,
            priority_distribution=priority_dist,
            active_prompt_versions=active_items,
            evaluated_cases=evaluated_cases,
            average_operator_score=round(float(avg_score), 2)
            if avg_score is not None
            else None,
            fallback_template_rate=round(fallback_rate, 4),
            phrase_review_rate=round(phrase_rate, 4),
        )

    def _count_responses_by_moderation(self, status: str) -> int:
        return (
            self.db.scalar(
                select(func.count(ReviewResponse.id)).where(
                    ReviewResponse.moderation_status == status
                )
            )
            or 0
        )

    def _count_responses_by_status(self, moderation: str, publication: str) -> int:
        return (
            self.db.scalar(
                select(func.count(ReviewResponse.id)).where(
                    ReviewResponse.moderation_status == moderation,
                    ReviewResponse.publication_status == publication,
                )
            )
            or 0
        )

    def _distribution(self, query) -> list[DistributionItem]:
        rows = self.db.execute(query).all()
        return [
            DistributionItem(label=str(label), count=int(count))
            for label, count in rows
            if label is not None
        ]
