from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ch_entities import (
    ProductArea,
    ResponseCase,
    ResponseCaseCandidate,
    ResponseCaseDecision,
    ResponseCaseExample,
    ReviewTopic,
)
from app.models.entities import (
    InteractionScenario,
    PriorityLevel,
    Review,
    ReviewClassification,
    ReviewResponse,
    SentimentProfile,
)
from app.schemas.reports import (
    BusinessProblemsReport,
    ChQualityReport,
    CustomerReviewsExportBundle,
    CustomerReviewsReport,
    ReportDistributionItem,
    ReportPeriodMeta,
    ReportTableRow,
    ReportTimeSeriesItem,
)
CANDIDATE_TYPE_NEW = "new_response_case"
UNDEFINED_TOPIC_LABEL = "Не определено"
UNCLASSIFIED_LABEL = "Не классифицировано"


class ReportsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def resolve_period(
        period: str,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> tuple[datetime, datetime, ReportPeriodMeta]:
        now = datetime.now(timezone.utc)
        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "custom" and date_from and date_to:
            start = date_from if date_from.tzinfo else date_from.replace(tzinfo=timezone.utc)
            end = date_to if date_to.tzinfo else date_to.replace(tzinfo=timezone.utc)
            meta = ReportPeriodMeta(period=period, date_from=start, date_to=end)
            return start, end, meta
        else:
            days = {"7": 7, "30": 30, "90": 90}.get(period, 30)
            start = now - timedelta(days=days)
        end = now
        meta = ReportPeriodMeta(period=period, date_from=start, date_to=end)
        return start, end, meta

    def customer_reviews(
        self,
        period: str,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> CustomerReviewsReport:
        start, end, meta = self.resolve_period(period, date_from, date_to)
        review_filter = (Review.created_at >= start, Review.created_at <= end)

        total = self.db.scalar(select(func.count(Review.id)).where(*review_filter)) or 0

        processed = (
            self.db.scalar(
                select(func.count(func.distinct(ReviewResponse.review_id)))
                .join(Review, Review.id == ReviewResponse.review_id)
                .where(
                    *review_filter,
                    ReviewResponse.moderation_status == "approved",
                    ReviewResponse.publication_status == "published",
                )
            )
            or 0
        )

        in_progress = (
            self.db.scalar(
                select(func.count(func.distinct(ReviewResponse.review_id)))
                .join(Review, Review.id == ReviewResponse.review_id)
                .where(*review_filter, ReviewResponse.moderation_status == "pending_review")
            )
            or 0
        )

        avg_rating = self.db.scalar(
            select(func.avg(Review.rating)).where(*review_filter, Review.rating.isnot(None))
        )

        avg_hours = self._avg_processing_hours(start, end)

        day_rows = self.db.execute(
            select(
                func.date_trunc("day", Review.created_at).label("d"),
                func.count(Review.id),
            )
            .where(*review_filter)
            .group_by("d")
            .order_by("d")
        ).all()
        reviews_by_day = [
            ReportTimeSeriesItem(label=row.d.strftime("%d.%m") if row.d else "—", count=int(row[1]))
            for row in day_rows
        ]

        topic_expr = self._business_topic_label_expr()
        by_product_area = self._review_distribution(review_filter, self._product_area_label_expr())
        by_topics = self._review_distribution(review_filter, topic_expr)
        by_scenario = self._review_distribution(review_filter, self._scenario_label_expr())
        by_sentiment = self._review_distribution(review_filter, self._sentiment_label_expr())
        by_priority = self._review_distribution(review_filter, self._priority_label_expr())

        topic_rows = [(item.label, item.count) for item in by_topics[:15]]
        top_topics = self._table_rows(topic_rows, total)

        summary = self._customer_summary(
            total, processed, by_scenario, by_sentiment, avg_rating
        )

        export_bundle = CustomerReviewsExportBundle(
            period=meta,
            kpis={
                "total_reviews": total,
                "processed_reviews": processed,
                "in_progress_reviews": in_progress,
                "average_rating": round(float(avg_rating), 2) if avg_rating is not None else None,
                "average_processing_hours": avg_hours,
            },
            reviews_by_day=reviews_by_day,
            by_product_area=by_product_area,
            by_topics=by_topics,
            by_scenario=by_scenario,
            by_sentiment=by_sentiment,
            by_priority=by_priority,
            top_topics=top_topics,
        )

        return CustomerReviewsReport(
            period=meta,
            total_reviews=total,
            processed_reviews=processed,
            in_progress_reviews=in_progress,
            average_rating=round(float(avg_rating), 2) if avg_rating is not None else None,
            average_processing_hours=avg_hours,
            reviews_by_day=reviews_by_day,
            by_product_area=by_product_area,
            by_scenario=by_scenario,
            by_sentiment=by_sentiment,
            by_priority=by_priority,
            top_topics=top_topics,
            export_bundle=export_bundle,
            summary=summary,
        )

    def business_problems(
        self,
        period: str,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> BusinessProblemsReport:
        start, end, meta = self.resolve_period(period, date_from, date_to)
        review_filter = (Review.created_at >= start, Review.created_at <= end)

        top_complaints = self._top_topics_for_scenario(review_filter, "complaint")
        top_suggestions = self._top_topics_for_scenario(review_filter, "suggestion")
        top_gratitude = self._top_topics_for_scenario(review_filter, "gratitude")
        new_topics = self._new_knowledge_topics(start, end)

        summary = self._business_attention_summary(
            top_complaints, top_suggestions, top_gratitude, new_topics
        )

        return BusinessProblemsReport(
            period=meta,
            top_complaints=top_complaints,
            top_suggestions=top_suggestions,
            top_gratitude=top_gratitude,
            new_topics=new_topics,
            summary=summary,
        )

    def ch_quality(
        self,
        period: str,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> ChQualityReport:
        start, end, meta = self.resolve_period(period, date_from, date_to)
        review_filter = (Review.created_at >= start, Review.created_at <= end)
        total_reviews = (
            self.db.scalar(select(func.count(Review.id)).where(*review_filter)) or 0
        )

        covered_reviews = (
            self.db.scalar(
                select(func.count(func.distinct(Review.id)))
                .select_from(Review)
                .join(
                    ResponseCaseDecision,
                    (ResponseCaseDecision.review_id == Review.id)
                    & (ResponseCaseDecision.is_current.is_(True)),
                )
                .where(*review_filter)
            )
            or 0
        )
        override_reviews = (
            self.db.scalar(
                select(func.count(func.distinct(Review.id)))
                .select_from(Review)
                .join(
                    ResponseCaseDecision,
                    (ResponseCaseDecision.review_id == Review.id)
                    & (ResponseCaseDecision.is_current.is_(True))
                    & (ResponseCaseDecision.is_operator_override.is_(True)),
                )
                .where(*review_filter)
            )
            or 0
        )
        low_conf = self._count_low_confidence_reviews(start, end)

        coverage_pct = (
            min(100.0, round(100 * covered_reviews / total_reviews, 1))
            if total_reviews
            else 0.0
        )
        override_rate_pct = (
            min(100.0, round(100 * override_reviews / total_reviews, 1))
            if total_reviews
            else 0.0
        )
        low_confidence_rate_pct = (
            min(100.0, round(100 * low_conf / total_reviews, 1)) if total_reviews else 0.0
        )

        new_cases = (
            self.db.scalar(
                select(func.count(ResponseCase.id)).where(
                    ResponseCase.created_at >= start,
                    ResponseCase.created_at <= end,
                )
            )
            or 0
        )
        new_examples = (
            self.db.scalar(
                select(func.count(ResponseCaseExample.id)).where(
                    ResponseCaseExample.created_at >= start,
                    ResponseCaseExample.created_at <= end,
                )
            )
            or 0
        )
        candidates_created = (
            self.db.scalar(
                select(func.count(ResponseCaseCandidate.id)).where(
                    ResponseCaseCandidate.created_at >= start,
                    ResponseCaseCandidate.created_at <= end,
                )
            )
            or 0
        )

        coverage_by_day = self._ch_reviews_with_case_by_day(review_filter)
        override_by_day = self._ch_override_reviews_by_day(review_filter)
        low_confidence_by_day = self._ch_low_confidence_reviews_by_day(start, end)

        prob_rows = self.db.execute(
            select(ResponseCase.title, func.count(func.distinct(Review.id)))
            .select_from(Review)
            .join(
                ResponseCaseDecision,
                (ResponseCaseDecision.review_id == Review.id)
                & (ResponseCaseDecision.is_current.is_(True))
                & (ResponseCaseDecision.is_operator_override.is_(True)),
            )
            .join(ResponseCase, ResponseCase.id == ResponseCaseDecision.response_case_id)
            .where(*review_filter)
            .group_by(ResponseCase.title)
            .order_by(func.count(func.distinct(Review.id)).desc())
            .limit(10)
        ).all()
        prob_total = sum(int(o) for _, o in prob_rows) or 1
        problematic_cases = [
            ReportTableRow(
                label=title or "—",
                count=int(ov),
                share=round(100 * int(ov) / prob_total, 1),
            )
            for title, ov in prob_rows
            if int(ov) > 0
        ]

        summary = self._ch_summary(
            coverage_pct,
            new_cases,
            new_examples,
            low_confidence_rate_pct,
            candidates_created,
        )

        return ChQualityReport(
            period=meta,
            coverage_pct=coverage_pct,
            override_rate_pct=override_rate_pct,
            low_confidence_rate_pct=low_confidence_rate_pct,
            new_cases=new_cases,
            new_examples=new_examples,
            candidates_created=candidates_created,
            coverage_by_day=coverage_by_day,
            override_by_day=override_by_day,
            low_confidence_by_day=low_confidence_by_day,
            problematic_cases=problematic_cases,
            problematic_cases_title="Часто переопределяемые типовые ситуации",
            problematic_cases_criterion=(
                "В список попадают ТС, по которым оператор чаще всего менял автоматический "
                "выбор (текущее решение с ручным переопределением)."
            ),
            summary=summary,
        )

    def _top_topics_for_scenario(
        self, review_filter, scenario_code: str, limit: int = 10
    ) -> list[ReportTableRow]:
        topic_expr = self._business_topic_label_expr()
        scenario_expr = self._review_scenario_code_expr()
        total = (
            self.db.scalar(
                select(func.count(Review.id)).where(*review_filter, scenario_expr == scenario_code)
            )
            or 0
        )
        if not total:
            return []
        rows = self.db.execute(
            select(topic_expr.label("topic_label"), func.count(Review.id))
            .where(*review_filter, scenario_expr == scenario_code)
            .group_by(topic_expr)
            .order_by(func.count(Review.id).desc())
            .limit(limit)
        ).all()
        return self._table_rows(rows, total)

    def _new_knowledge_topics(self, start: datetime, end: datetime) -> list[ReportTableRow]:
        topic_label = func.coalesce(ReviewTopic.name, ResponseCaseCandidate.proposed_title, "—")
        case_rows = self.db.execute(
            select(ReviewTopic.name, func.count(ResponseCase.id))
            .join(ReviewTopic, ReviewTopic.id == ResponseCase.topic_id)
            .where(
                ResponseCase.created_at >= start,
                ResponseCase.created_at <= end,
            )
            .group_by(ReviewTopic.name)
        ).all()
        cand_rows = self.db.execute(
            select(
                topic_label.label("topic_label"),
                func.count(func.distinct(ResponseCaseCandidate.review_id)),
            )
            .outerjoin(ReviewTopic, ReviewTopic.id == ResponseCaseCandidate.proposed_topic_id)
            .where(
                ResponseCaseCandidate.created_at >= start,
                ResponseCaseCandidate.created_at <= end,
            )
            .group_by(topic_label)
        ).all()
        merged: dict[str, int] = {}
        for name, cnt in case_rows:
            key = str(name or "—")
            merged[key] = merged.get(key, 0) + int(cnt)
        for name, cnt in cand_rows:
            key = str(name or "—")
            merged[key] = merged.get(key, 0) + int(cnt)
        if not merged:
            return []
        total = sum(merged.values()) or 1
        ordered = sorted(merged.items(), key=lambda x: -x[1])[:12]
        return [
            ReportTableRow(
                label=label[:120],
                count=count,
                share=round(100 * count / total, 1),
            )
            for label, count in ordered
        ]

    @classmethod
    def _review_scenario_code_expr(cls):
        case_code = (
            select(InteractionScenario.scenario_code)
            .select_from(ResponseCaseDecision)
            .join(ResponseCase, ResponseCase.id == ResponseCaseDecision.response_case_id)
            .join(InteractionScenario, InteractionScenario.id == ResponseCase.scenario_id)
            .where(
                ResponseCaseDecision.review_id == Review.id,
                ResponseCaseDecision.is_current.is_(True),
            )
            .order_by(ResponseCaseDecision.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )
        cls_code = (
            select(InteractionScenario.scenario_code)
            .select_from(ReviewClassification)
            .outerjoin(
                InteractionScenario,
                InteractionScenario.id == ReviewClassification.scenario_id,
            )
            .where(ReviewClassification.review_id == Review.id)
            .order_by(ReviewClassification.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )
        cls_legacy = (
            select(ReviewClassification.scenario)
            .where(ReviewClassification.review_id == Review.id)
            .order_by(ReviewClassification.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )
        return func.coalesce(case_code, cls_code, cls_legacy, UNCLASSIFIED_LABEL)

    def _review_distribution(self, review_filter, label_expr) -> list[ReportDistributionItem]:
        rows = self.db.execute(
            select(label_expr.label("dim_label"), func.count(Review.id))
            .where(*review_filter)
            .group_by(label_expr)
            .order_by(func.count(Review.id).desc())
        ).all()
        return [
            ReportDistributionItem(label=str(label or UNCLASSIFIED_LABEL), count=int(cnt))
            for label, cnt in rows
        ]

    @staticmethod
    def _case_scenario_subq():
        return (
            select(InteractionScenario.scenario_name)
            .select_from(ResponseCaseDecision)
            .join(ResponseCase, ResponseCase.id == ResponseCaseDecision.response_case_id)
            .join(InteractionScenario, InteractionScenario.id == ResponseCase.scenario_id)
            .where(
                ResponseCaseDecision.review_id == Review.id,
                ResponseCaseDecision.is_current.is_(True),
            )
            .order_by(ResponseCaseDecision.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )

    @staticmethod
    def _latest_cls_scenario_subq():
        return (
            select(InteractionScenario.scenario_name)
            .select_from(ReviewClassification)
            .join(InteractionScenario, InteractionScenario.id == ReviewClassification.scenario_id)
            .where(ReviewClassification.review_id == Review.id)
            .order_by(ReviewClassification.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )

    @classmethod
    def _scenario_label_expr(cls):
        return func.coalesce(
            cls._case_scenario_subq(),
            cls._latest_cls_scenario_subq(),
            UNCLASSIFIED_LABEL,
        )

    @staticmethod
    def _case_sentiment_subq():
        return (
            select(SentimentProfile.sentiment_name)
            .select_from(ResponseCaseDecision)
            .join(ResponseCase, ResponseCase.id == ResponseCaseDecision.response_case_id)
            .join(SentimentProfile, SentimentProfile.id == ResponseCase.sentiment_id)
            .where(
                ResponseCaseDecision.review_id == Review.id,
                ResponseCaseDecision.is_current.is_(True),
            )
            .order_by(ResponseCaseDecision.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )

    @staticmethod
    def _latest_cls_sentiment_subq():
        return (
            select(SentimentProfile.sentiment_name)
            .select_from(ReviewClassification)
            .join(SentimentProfile, SentimentProfile.id == ReviewClassification.sentiment_id)
            .where(ReviewClassification.review_id == Review.id)
            .order_by(ReviewClassification.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )

    @classmethod
    def _sentiment_label_expr(cls):
        return func.coalesce(
            cls._case_sentiment_subq(),
            cls._latest_cls_sentiment_subq(),
            UNCLASSIFIED_LABEL,
        )

    @staticmethod
    def _case_priority_subq():
        return (
            select(PriorityLevel.priority_name)
            .select_from(ResponseCaseDecision)
            .join(ResponseCase, ResponseCase.id == ResponseCaseDecision.response_case_id)
            .join(PriorityLevel, PriorityLevel.id == ResponseCase.priority_id)
            .where(
                ResponseCaseDecision.review_id == Review.id,
                ResponseCaseDecision.is_current.is_(True),
            )
            .order_by(ResponseCaseDecision.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )

    @staticmethod
    def _latest_cls_priority_subq():
        return (
            select(PriorityLevel.priority_name)
            .select_from(ReviewClassification)
            .join(PriorityLevel, PriorityLevel.id == ReviewClassification.priority_id)
            .where(ReviewClassification.review_id == Review.id)
            .order_by(ReviewClassification.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )

    @classmethod
    def _priority_label_expr(cls):
        return func.coalesce(
            cls._case_priority_subq(),
            cls._latest_cls_priority_subq(),
            UNCLASSIFIED_LABEL,
        )

    @staticmethod
    def _case_product_area_subq():
        return (
            select(ProductArea.name)
            .select_from(ResponseCaseDecision)
            .join(ResponseCase, ResponseCase.id == ResponseCaseDecision.response_case_id)
            .join(ProductArea, ProductArea.id == ResponseCase.product_area_id)
            .where(
                ResponseCaseDecision.review_id == Review.id,
                ResponseCaseDecision.is_current.is_(True),
            )
            .order_by(ResponseCaseDecision.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )

    @staticmethod
    def _latest_cls_product_area_subq():
        return (
            select(ProductArea.name)
            .select_from(ReviewClassification)
            .outerjoin(ProductArea, ProductArea.code == ReviewClassification.product_area)
            .where(ReviewClassification.review_id == Review.id)
            .order_by(ReviewClassification.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )

    @staticmethod
    def _review_product_area_code_subq():
        return (
            select(ProductArea.name)
            .where(ProductArea.code == Review.product_area)
            .correlate(Review)
            .scalar_subquery()
        )

    @classmethod
    def _product_area_label_expr(cls):
        return func.coalesce(
            cls._case_product_area_subq(),
            cls._latest_cls_product_area_subq(),
            cls._review_product_area_code_subq(),
            UNCLASSIFIED_LABEL,
        )

    @staticmethod
    def _business_topic_label_expr():
        """Business topic for reports: current CH case topic → classification topic code → fallback."""
        case_topic = (
            select(ReviewTopic.name)
            .select_from(ResponseCaseDecision)
            .join(ResponseCase, ResponseCase.id == ResponseCaseDecision.response_case_id)
            .join(ReviewTopic, ReviewTopic.id == ResponseCase.topic_id)
            .where(
                ResponseCaseDecision.review_id == Review.id,
                ResponseCaseDecision.is_current.is_(True),
            )
            .order_by(ResponseCaseDecision.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )
        classification_topic = (
            select(ReviewTopic.name)
            .select_from(ReviewClassification)
            .join(ReviewTopic, ReviewTopic.code == ReviewClassification.topic)
            .where(ReviewClassification.review_id == Review.id)
            .order_by(ReviewClassification.created_at.desc())
            .limit(1)
            .correlate(Review)
            .scalar_subquery()
        )
        return func.coalesce(case_topic, classification_topic, UNDEFINED_TOPIC_LABEL)

    def _avg_processing_hours(self, start: datetime, end: datetime) -> float | None:
        rows = self.db.execute(
            select(
                Review.created_at,
                func.max(ReviewResponse.updated_at),
            )
            .join(ReviewResponse, ReviewResponse.review_id == Review.id)
            .where(
                Review.created_at >= start,
                Review.created_at <= end,
                ReviewResponse.publication_status == "published",
            )
            .group_by(Review.id, Review.created_at)
        ).all()
        if not rows:
            return None
        total_seconds = 0.0
        n = 0
        for created, updated in rows:
            if created and updated:
                total_seconds += (updated - created).total_seconds()
                n += 1
        if not n:
            return None
        return round(total_seconds / n / 3600, 1)

    def _count_low_confidence_reviews(self, start: datetime, end: datetime) -> int:
        band = ReviewResponse.generation_metadata["confidence_band"].astext
        pipeline = ReviewResponse.generation_metadata["pipeline"].astext
        return (
            self.db.scalar(
                select(func.count(func.distinct(Review.id)))
                .join(ReviewResponse, ReviewResponse.review_id == Review.id)
                .where(
                    Review.created_at >= start,
                    Review.created_at <= end,
                    pipeline == "controlled_hybrid",
                    band == "low",
                )
            )
            or 0
        )

    def _ch_reviews_with_case_by_day(self, review_filter) -> list[ReportTimeSeriesItem]:
        rows = self.db.execute(
            select(
                func.date_trunc("day", Review.created_at).label("d"),
                func.count(func.distinct(Review.id)),
            )
            .select_from(Review)
            .join(
                ResponseCaseDecision,
                (ResponseCaseDecision.review_id == Review.id)
                & (ResponseCaseDecision.is_current.is_(True)),
            )
            .where(*review_filter)
            .group_by("d")
            .order_by("d")
        ).all()
        return [
            ReportTimeSeriesItem(label=row.d.strftime("%d.%m") if row.d else "—", count=int(row[1]))
            for row in rows
        ]

    def _ch_override_reviews_by_day(self, review_filter) -> list[ReportTimeSeriesItem]:
        rows = self.db.execute(
            select(
                func.date_trunc("day", Review.created_at).label("d"),
                func.count(func.distinct(Review.id)),
            )
            .select_from(Review)
            .join(
                ResponseCaseDecision,
                (ResponseCaseDecision.review_id == Review.id)
                & (ResponseCaseDecision.is_current.is_(True))
                & (ResponseCaseDecision.is_operator_override.is_(True)),
            )
            .where(*review_filter)
            .group_by("d")
            .order_by("d")
        ).all()
        return [
            ReportTimeSeriesItem(label=row.d.strftime("%d.%m") if row.d else "—", count=int(row[1]))
            for row in rows
        ]

    def _ch_low_confidence_reviews_by_day(
        self, start: datetime, end: datetime
    ) -> list[ReportTimeSeriesItem]:
        band = ReviewResponse.generation_metadata["confidence_band"].astext
        pipeline = ReviewResponse.generation_metadata["pipeline"].astext
        rows = self.db.execute(
            select(
                func.date_trunc("day", Review.created_at).label("d"),
                func.count(func.distinct(Review.id)),
            )
            .join(ReviewResponse, ReviewResponse.review_id == Review.id)
            .where(
                Review.created_at >= start,
                Review.created_at <= end,
                pipeline == "controlled_hybrid",
                band == "low",
            )
            .group_by("d")
            .order_by("d")
        ).all()
        return [
            ReportTimeSeriesItem(label=row.d.strftime("%d.%m") if row.d else "—", count=int(row[1]))
            for row in rows
        ]

    @staticmethod
    def _table_rows(rows, total: int) -> list[ReportTableRow]:
        total = total or 1
        return [
            ReportTableRow(
                label=str(label or "—"),
                count=int(cnt),
                share=round(100 * int(cnt) / total, 1),
            )
            for label, cnt in rows
        ]

    @staticmethod
    def _customer_summary(total, processed, by_scenario, by_sentiment, avg_rating) -> str:
        if total == 0:
            return "За выбранный период обращений не зарегистрировано."
        top_scenario = by_scenario[0].label if by_scenario else "не определён"
        neg = sum(
            c.count
            for c in by_sentiment
            if c.label and any(x in c.label.lower() for x in ("негат", "агресс", "negative"))
        )
        neg_pct = round(100 * neg / total, 0) if total else 0
        rating_part = (
            f" Средняя оценка — {float(avg_rating):.1f}."
            if avg_rating is not None
            else ""
        )
        return (
            f"За период зарегистрировано {total} обращений, обработано {processed}. "
            f"Наиболее частый сценарий — «{top_scenario}». "
            f"Доля негативных обращений составила {neg_pct}%.{rating_part}"
        )

    @staticmethod
    def _business_attention_summary(
        top_complaints: list[ReportTableRow],
        top_suggestions: list[ReportTableRow],
        top_gratitude: list[ReportTableRow],
        new_topics: list[ReportTableRow],
    ) -> str:
        lines: list[str] = []
        if top_complaints:
            leader = top_complaints[0]
            lines.append(
                f"Основная зона недовольства клиентов: «{leader.label}» "
                f"({leader.count} жалоб, {leader.share}% от жалоб за период)."
            )
        else:
            lines.append("Основная зона недовольства клиентов: за период жалоб не зафиксировано.")
        if top_gratitude:
            leader = top_gratitude[0]
            lines.append(
                f"Основная причина благодарностей: «{leader.label}» "
                f"({leader.count} обращений, {leader.share}% от благодарностей)."
            )
        else:
            lines.append("Основная причина благодарностей: за период благодарностей не зафиксировано.")
        if top_suggestions:
            leader = top_suggestions[0]
            lines.append(
                f"Основное предложение по улучшению: «{leader.label}» "
                f"({leader.count} обращений, {leader.share}% от предложений)."
            )
        else:
            lines.append("Основное предложение по улучшению: за период предложений не зафиксировано.")
        if new_topics:
            leaders = ", ".join(f"«{t.label}»" for t in new_topics[:3])
            lines.append(
                f"Новых тем для расширения базы знаний выявлено: {len(new_topics)} "
                f"(лидеры: {leaders})."
            )
        else:
            lines.append("Новых тем для расширения базы знаний выявлено: 0.")
        return "\n".join(lines)

    @staticmethod
    def _ch_summary(coverage, new_cases, new_examples, low_pct, candidates) -> str:
        return (
            f"Покрытие базы знаний — {coverage:.0f}%. "
            f"Создано {new_cases} типовых ситуаций, добавлено {new_examples} retrieval-примеров. "
            f"Доля обращений с низкой уверенностью системы — {low_pct:.0f}%. "
            f"Кандидатов на расширение базы знаний: {candidates}."
        )
