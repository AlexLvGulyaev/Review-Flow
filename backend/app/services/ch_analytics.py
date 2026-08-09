from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.ch_entities import (
    ProductArea,
    ResponseCase,
    ResponseCaseCandidate,
    ResponseCaseDecision,
    ResponseCaseExample,
    ResponseCaseFeedback,
    ReviewTopic,
)
from app.models.entities import OperationalLog, Review, ReviewResponse
from app.schemas.ch_analytics import (
    CandidateAnalytics,
    ChAnalyticsDashboard,
    ChAuditEntry,
    ChAuditTrail,
    ChOverviewMetrics,
    ConfidenceAnalytics,
    ConfidenceBreakdown,
    CountItem,
    KbHealthMetrics,
    OverrideAnalytics,
    OverrideCaseStat,
    OverrideReasonStat,
    ResponseCaseQualityRow,
    RetrievalMissRow,
)
from app.services.controlled_hybrid.confidence import evaluate_confidence

CH_AUDIT_EVENT_TYPES = (
    "case_decision_recorded",
    "operator_case_confirmed",
    "operator_case_override",
    "case_candidate_created",
    "case_candidate_promoted",
    "case_candidate_merged",
    "case_candidate_rejected",
    "case_retrieval_low_confidence",
    "case_confidence_evaluated",
    "example_learning_candidate_created",
)


class ChAnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_dashboard(
        self,
        *,
        days: int = 30,
        product_area_id: uuid.UUID | None = None,
        topic_id: uuid.UUID | None = None,
        case_quality_limit: int = 50,
        misses_limit: int = 50,
    ) -> ChAnalyticsDashboard:
        since = self._since(days)
        return ChAnalyticsDashboard(
            overview=self._overview(since, days),
            confidence=self._confidence(since, product_area_id, topic_id),
            overrides=self._overrides(since),
            candidates=self._candidates(since),
            case_quality=self._case_quality(since, limit=case_quality_limit),
            retrieval_misses=self._retrieval_misses(since, limit=misses_limit),
            kb_health=self._kb_health(since),
        )

    def get_audit(self, *, days: int = 30, limit: int = 100) -> ChAuditTrail:
        since = self._since(days)
        rows = self.db.scalars(
            select(OperationalLog)
            .where(
                OperationalLog.event_type.in_(CH_AUDIT_EVENT_TYPES),
                OperationalLog.created_at >= since,
            )
            .order_by(OperationalLog.created_at.desc())
            .limit(limit)
        ).all()
        return ChAuditTrail(
            period_days=days,
            items=[
                ChAuditEntry(
                    id=r.id,
                    event_type=r.event_type,
                    entity_type=r.entity_type,
                    entity_id=r.entity_id,
                    status=r.status,
                    created_at=r.created_at,
                    metadata=r.metadata_ or {},
                )
                for r in rows
            ],
        )

    @staticmethod
    def _since(days: int) -> datetime:
        return datetime.now(timezone.utc) - timedelta(days=max(1, days))

    def _decision_query(self, since: datetime):
        return select(ResponseCaseDecision).where(ResponseCaseDecision.created_at >= since)

    def _overview(self, since: datetime, days: int) -> ChOverviewMetrics:
        total_decisions = self.db.scalar(
            select(func.count(ResponseCaseDecision.id)).where(
                ResponseCaseDecision.created_at >= since
            )
        ) or 0
        total_matched = self.db.scalar(
            select(func.count(ResponseCaseDecision.id)).where(
                ResponseCaseDecision.created_at >= since,
                ResponseCaseDecision.is_current.is_(True),
            )
        ) or 0
        total_overrides = self.db.scalar(
            select(func.count(ResponseCaseDecision.id)).where(
                ResponseCaseDecision.created_at >= since,
                ResponseCaseDecision.is_operator_override.is_(True),
            )
        ) or 0
        low_from_logs = self.db.scalar(
            select(func.count(OperationalLog.id)).where(
                OperationalLog.created_at >= since,
                OperationalLog.event_type == "case_retrieval_low_confidence",
            )
        ) or 0
        low_from_band = self._count_low_confidence_responses(since)
        total_low = max(low_from_logs, low_from_band)

        total_candidates = (
            self.db.scalar(
                select(func.count(ResponseCaseCandidate.id)).where(
                    ResponseCaseCandidate.created_at >= since
                )
            )
            or 0
        )
        approved_candidates = (
            self.db.scalar(
                select(func.count(ResponseCaseCandidate.id)).where(
                    ResponseCaseCandidate.created_at >= since,
                    ResponseCaseCandidate.status.in_(("approved", "merged")),
                )
            )
            or 0
        )
        rejected_candidates = (
            self.db.scalar(
                select(func.count(ResponseCaseCandidate.id)).where(
                    ResponseCaseCandidate.created_at >= since,
                    ResponseCaseCandidate.status == "rejected",
                )
            )
            or 0
        )

        return ChOverviewMetrics(
            total_decisions=total_decisions,
            total_matched_cases=total_matched,
            total_low_confidence=total_low,
            total_overrides=total_overrides,
            total_candidates=total_candidates,
            approved_candidates=approved_candidates,
            rejected_candidates=rejected_candidates,
            period_days=days,
        )

    def _count_low_confidence_responses(self, since: datetime) -> int:
        band = ReviewResponse.generation_metadata["confidence_band"].astext
        pipeline = ReviewResponse.generation_metadata["pipeline"].astext
        return (
            self.db.scalar(
                select(func.count(ReviewResponse.id)).where(
                    ReviewResponse.created_at >= since,
                    pipeline == "controlled_hybrid",
                    band == "low",
                )
            )
            or 0
        )

    def _confidence(
        self,
        since: datetime,
        product_area_id: uuid.UUID | None,
        topic_id: uuid.UUID | None,
    ) -> ConfidenceAnalytics:
        overall = self._confidence_from_logs(since)
        if overall.total == 0:
            overall = self._confidence_from_responses(since)

        by_area: list[CountItem] = []
        by_topic: list[CountItem] = []
        if product_area_id is None and topic_id is None:
            by_area = self._confidence_grouped_by_case_attr(since, "product_area")
            by_topic = self._confidence_grouped_by_case_attr(since, "topic")

        if product_area_id:
            overall = self._confidence_from_decisions(
                since, product_area_id=product_area_id, topic_id=None
            )
        if topic_id:
            overall = self._confidence_from_decisions(
                since, product_area_id=None, topic_id=topic_id
            )

        return ConfidenceAnalytics(overall=overall, by_product_area=by_area, by_topic=by_topic)

    def _confidence_from_logs(self, since: datetime) -> ConfidenceBreakdown:
        rows = self.db.execute(
            select(
                OperationalLog.metadata_["confidence_band"].astext,
                func.count(OperationalLog.id),
            )
            .where(
                OperationalLog.created_at >= since,
                OperationalLog.event_type == "case_confidence_evaluated",
            )
            .group_by(OperationalLog.metadata_["confidence_band"].astext)
        ).all()
        return self._breakdown_from_rows(rows)

    def _confidence_from_responses(self, since: datetime) -> ConfidenceBreakdown:
        band = ReviewResponse.generation_metadata["confidence_band"].astext
        pipeline = ReviewResponse.generation_metadata["pipeline"].astext
        rows = self.db.execute(
            select(band, func.count(ReviewResponse.id))
            .where(
                ReviewResponse.created_at >= since,
                pipeline == "controlled_hybrid",
                band.isnot(None),
            )
            .group_by(band)
        ).all()
        return self._breakdown_from_rows(rows)

    def _confidence_from_decisions(
        self,
        since: datetime,
        *,
        product_area_id: uuid.UUID | None,
        topic_id: uuid.UUID | None,
    ) -> ConfidenceBreakdown:
        stmt = (
            select(ResponseCaseDecision, ResponseCase)
            .join(ResponseCase, ResponseCase.id == ResponseCaseDecision.response_case_id)
            .where(ResponseCaseDecision.created_at >= since)
        )
        if product_area_id:
            stmt = stmt.where(ResponseCase.product_area_id == product_area_id)
        if topic_id:
            stmt = stmt.where(ResponseCase.topic_id == topic_id)
        counts = {"high": 0, "medium": 0, "low": 0}
        for decision, case in self.db.execute(stmt).all():
            score = float(decision.match_confidence or 0)
            band = evaluate_confidence(score, case.confidence_threshold).band.value
            counts[band] = counts.get(band, 0) + 1
        total = sum(counts.values())
        return ConfidenceBreakdown(
            high=counts.get("high", 0),
            medium=counts.get("medium", 0),
            low=counts.get("low", 0),
            total=total,
        )

    def _confidence_grouped_by_case_attr(
        self, since: datetime, attr: str
    ) -> list[CountItem]:
        """Low-confidence hits grouped by product area or topic name."""
        if attr == "product_area":
            name_col = ProductArea.name
            join_col = ResponseCase.product_area_id == ProductArea.id
        else:
            name_col = ReviewTopic.name
            join_col = ResponseCase.topic_id == ReviewTopic.id

        rows = self.db.execute(
            select(name_col, func.count(ResponseCaseFeedback.id))
            .select_from(ResponseCaseFeedback)
            .join(Review, Review.id == ResponseCaseFeedback.review_id)
            .outerjoin(
                ResponseCaseDecision,
                (ResponseCaseDecision.review_id == Review.id)
                & (ResponseCaseDecision.is_current.is_(True)),
            )
            .outerjoin(ResponseCase, ResponseCase.id == ResponseCaseDecision.response_case_id)
            .join(ProductArea if attr == "product_area" else ReviewTopic, join_col)
            .where(
                ResponseCaseFeedback.created_at >= since,
                ResponseCaseFeedback.feedback_type == "new_case_needed",
            )
            .group_by(name_col)
            .order_by(func.count(ResponseCaseFeedback.id).desc())
            .limit(15)
        ).all()
        return [CountItem(label=label or "—", count=cnt) for label, cnt in rows]

    @staticmethod
    def _breakdown_from_rows(rows) -> ConfidenceBreakdown:
        counts = {"high": 0, "medium": 0, "low": 0}
        for label, cnt in rows:
            if not label:
                continue
            key = str(label).lower()
            if key in counts:
                counts[key] += int(cnt)
        total = sum(counts.values())
        return ConfidenceBreakdown(
            high=counts["high"],
            medium=counts["medium"],
            low=counts["low"],
            total=total,
        )

    def _overrides(self, since: datetime) -> OverrideAnalytics:
        override_count = (
            self.db.scalar(
                select(func.count(ResponseCaseDecision.id)).where(
                    ResponseCaseDecision.created_at >= since,
                    ResponseCaseDecision.is_operator_override.is_(True),
                )
            )
            or 0
        )
        total_decisions = (
            self.db.scalar(
                select(func.count(ResponseCaseDecision.id)).where(
                    ResponseCaseDecision.created_at >= since
                )
            )
            or 0
        )
        pct = round(100.0 * override_count / total_decisions, 1) if total_decisions else 0.0

        top_rows = self.db.execute(
            select(
                ResponseCase.id,
                ResponseCase.case_code,
                ResponseCase.title,
                func.count(ResponseCaseFeedback.id),
            )
            .join(
                ResponseCaseFeedback,
                ResponseCaseFeedback.response_case_id == ResponseCase.id,
            )
            .where(
                ResponseCaseFeedback.created_at >= since,
                ResponseCaseFeedback.feedback_type == "wrong_case",
            )
            .group_by(ResponseCase.id, ResponseCase.case_code, ResponseCase.title)
            .order_by(func.count(ResponseCaseFeedback.id).desc())
            .limit(10)
        ).all()

        reason_rows = self.db.execute(
            select(
                ResponseCaseFeedback.rejection_reason,
                func.count(ResponseCaseFeedback.id),
            )
            .where(
                ResponseCaseFeedback.created_at >= since,
                ResponseCaseFeedback.feedback_type == "wrong_case",
            )
            .group_by(ResponseCaseFeedback.rejection_reason)
            .order_by(func.count(ResponseCaseFeedback.id).desc())
            .limit(10)
        ).all()

        sample_comments: dict[str, str | None] = {}
        for reason, _ in reason_rows:
            key = reason or "no_reason"
            row = self.db.scalar(
                select(ResponseCaseFeedback.comment)
                .where(
                    ResponseCaseFeedback.created_at >= since,
                    ResponseCaseFeedback.feedback_type == "wrong_case",
                    ResponseCaseFeedback.rejection_reason == reason
                    if reason
                    else ResponseCaseFeedback.rejection_reason.is_(None),
                )
                .order_by(ResponseCaseFeedback.created_at.desc())
                .limit(1)
            )
            sample_comments[key] = row

        return OverrideAnalytics(
            override_count=override_count,
            override_percent=pct,
            top_overridden_cases=[
                OverrideCaseStat(
                    case_id=cid,
                    case_code=code,
                    title=title,
                    override_count=cnt,
                )
                for cid, code, title, cnt in top_rows
            ],
            reasons=[
                OverrideReasonStat(
                    reason=reason or "не указана",
                    count=cnt,
                    sample_comment=sample_comments.get(reason or "no_reason"),
                )
                for reason, cnt in reason_rows
            ],
        )

    def _candidates(self, since: datetime) -> CandidateAnalytics:
        status_rows = self.db.execute(
            select(ResponseCaseCandidate.status, func.count(ResponseCaseCandidate.id))
            .where(ResponseCaseCandidate.created_at >= since)
            .group_by(ResponseCaseCandidate.status)
        ).all()
        area_rows = self.db.execute(
            select(ProductArea.name, func.count(ResponseCaseCandidate.id))
            .join(
                ProductArea,
                ProductArea.id == ResponseCaseCandidate.proposed_product_area_id,
            )
            .where(ResponseCaseCandidate.created_at >= since)
            .group_by(ProductArea.name)
            .order_by(func.count(ResponseCaseCandidate.id).desc())
        ).all()
        topic_rows = self.db.execute(
            select(ReviewTopic.name, func.count(ResponseCaseCandidate.id))
            .join(ReviewTopic, ReviewTopic.id == ResponseCaseCandidate.proposed_topic_id)
            .where(ResponseCaseCandidate.created_at >= since)
            .group_by(ReviewTopic.name)
            .order_by(func.count(ResponseCaseCandidate.id).desc())
        ).all()
        return CandidateAnalytics(
            by_status=[CountItem(label=s, count=c) for s, c in status_rows],
            by_product_area=[CountItem(label=n or "—", count=c) for n, c in area_rows],
            by_topic=[CountItem(label=n or "—", count=c) for n, c in topic_rows],
        )

    def _case_quality(self, since: datetime, *, limit: int) -> list[ResponseCaseQualityRow]:
        cases = self.db.scalars(
            select(ResponseCase)
            .options(
                joinedload(ResponseCase.product_area),
                joinedload(ResponseCase.topic),
            )
            .order_by(ResponseCase.title)
        ).all()

        no_case_fits_rejection = exists(
            select(1).where(
                ResponseCaseFeedback.review_id == ResponseCaseDecision.review_id,
                ResponseCaseFeedback.response_case_id == ResponseCaseDecision.response_case_id,
                ResponseCaseFeedback.rejection_reason == "no_case_fits",
            )
        )
        hit_map = dict(
            self.db.execute(
                select(ResponseCaseDecision.response_case_id, func.count(ResponseCaseDecision.id))
                .where(
                    ResponseCaseDecision.created_at >= since,
                    ~no_case_fits_rejection,
                )
                .group_by(ResponseCaseDecision.response_case_id)
            ).all()
        )
        override_map = dict(
            self.db.execute(
                select(ResponseCaseDecision.response_case_id, func.count(ResponseCaseDecision.id))
                .where(
                    ResponseCaseDecision.created_at >= since,
                    ResponseCaseDecision.is_operator_override.is_(True),
                )
                .group_by(ResponseCaseDecision.response_case_id)
            ).all()
        )
        feedback_map = dict(
            self.db.execute(
                select(ResponseCaseFeedback.response_case_id, func.count(ResponseCaseFeedback.id))
                .where(
                    ResponseCaseFeedback.created_at >= since,
                    ResponseCaseFeedback.response_case_id.isnot(None),
                )
                .group_by(ResponseCaseFeedback.response_case_id)
            ).all()
        )
        cand_by_case = dict(
            self.db.execute(
                select(
                    func.coalesce(
                        ResponseCaseCandidate.merged_into_case_id,
                        ResponseCaseCandidate.promoted_response_case_id,
                    ),
                    func.count(ResponseCaseCandidate.id),
                )
                .where(
                    ResponseCaseCandidate.created_at >= since,
                    or_(
                        ResponseCaseCandidate.merged_into_case_id.isnot(None),
                        ResponseCaseCandidate.promoted_response_case_id.isnot(None),
                    ),
                )
                .group_by(
                    func.coalesce(
                        ResponseCaseCandidate.merged_into_case_id,
                        ResponseCaseCandidate.promoted_response_case_id,
                    )
                )
            ).all()
        )
        wrong_case_map = dict(
            self.db.execute(
                select(ResponseCaseFeedback.response_case_id, func.count(ResponseCaseFeedback.id))
                .where(
                    ResponseCaseFeedback.created_at >= since,
                    ResponseCaseFeedback.feedback_type == "wrong_case",
                    ResponseCaseFeedback.response_case_id.isnot(None),
                )
                .group_by(ResponseCaseFeedback.response_case_id)
            ).all()
        )

        rows: list[ResponseCaseQualityRow] = []
        for case in cases:
            cid = case.id
            hits = hit_map.get(cid, 0)
            overrides = override_map.get(cid, 0)
            wrong = wrong_case_map.get(cid, 0)
            feedback = feedback_map.get(cid, 0)
            candidates = cand_by_case.get(cid, 0)
            problem = wrong * 3 + overrides * 2 + feedback + candidates
            rows.append(
                ResponseCaseQualityRow(
                    case_id=cid,
                    case_code=case.case_code,
                    title=case.title,
                    product_area=case.product_area.name if case.product_area else "—",
                    topic=case.topic.name if case.topic else "—",
                    is_active=case.is_active,
                    hit_count=hits,
                    override_count=overrides + wrong,
                    feedback_count=feedback,
                    candidate_count=candidates,
                    problem_score=problem,
                )
            )
        rows.sort(key=lambda r: (-r.problem_score, -r.override_count, r.title))
        return rows[:limit]

    def _retrieval_misses(self, since: datetime, *, limit: int) -> list[RetrievalMissRow]:
        misses: list[RetrievalMissRow] = []

        log_rows = self.db.scalars(
            select(OperationalLog)
            .where(
                OperationalLog.created_at >= since,
                OperationalLog.event_type == "case_retrieval_low_confidence",
            )
            .order_by(OperationalLog.created_at.desc())
            .limit(limit)
        ).all()
        for log in log_rows:
            if not log.entity_id:
                continue
            review = self.db.get(Review, log.entity_id)
            meta = log.metadata_ or {}
            reason = meta.get("reason") or meta.get("confidence_band") or "low_confidence"
            misses.append(
                RetrievalMissRow(
                    review_id=log.entity_id,
                    request_number=review.request_number if review else None,
                    miss_type="low_confidence" if reason != "no_active_cases_or_examples" else "no_match",
                    detail=str(reason),
                    confidence_band=meta.get("confidence_band"),
                    created_at=log.created_at,
                    product_area=None,
                    topic=None,
                )
            )

        feedback_rows = self.db.scalars(
            select(ResponseCaseFeedback)
            .where(
                ResponseCaseFeedback.created_at >= since,
                ResponseCaseFeedback.feedback_type == "new_case_needed",
            )
            .order_by(ResponseCaseFeedback.created_at.desc())
            .limit(limit)
        ).all()
        seen_reviews = {m.review_id for m in misses}
        for fb in feedback_rows:
            if fb.review_id in seen_reviews:
                continue
            review = self.db.get(Review, fb.review_id)
            misses.append(
                RetrievalMissRow(
                    review_id=fb.review_id,
                    request_number=review.request_number if review else None,
                    miss_type="new_case_needed",
                    detail=(fb.comment or "")[:200] or None,
                    confidence_band="low",
                    created_at=fb.created_at,
                    product_area=None,
                    topic=None,
                )
            )
            seen_reviews.add(fb.review_id)

        cand_rows = self.db.scalars(
            select(ResponseCaseCandidate)
            .where(ResponseCaseCandidate.created_at >= since)
            .order_by(ResponseCaseCandidate.created_at.desc())
            .limit(limit)
        ).all()
        for c in cand_rows:
            if c.review_id in seen_reviews:
                continue
            review = self.db.get(Review, c.review_id)
            area = topic = None
            if c.proposed_product_area_id:
                pa = self.db.get(ProductArea, c.proposed_product_area_id)
                area = pa.name if pa else None
            if c.proposed_topic_id:
                t = self.db.get(ReviewTopic, c.proposed_topic_id)
                topic = t.name if t else None
            misses.append(
                RetrievalMissRow(
                    review_id=c.review_id,
                    request_number=review.request_number if review else None,
                    miss_type="candidate_created",
                    detail=c.proposed_title,
                    confidence_band=None,
                    created_at=c.created_at,
                    product_area=area,
                    topic=topic,
                )
            )
            seen_reviews.add(c.review_id)

        misses.sort(key=lambda m: m.created_at, reverse=True)
        return misses[:limit]

    def _kb_health(self, since: datetime) -> KbHealthMetrics:
        active = (
            self.db.scalar(
                select(func.count(ResponseCase.id)).where(ResponseCase.is_active.is_(True))
            )
            or 0
        )
        archived = (
            self.db.scalar(
                select(func.count(ResponseCase.id)).where(ResponseCase.is_active.is_(False))
            )
            or 0
        )
        examples = (
            self.db.scalar(
                select(func.count(ResponseCaseExample.id)).where(
                    ResponseCaseExample.is_active.is_(True)
                )
            )
            or 0
        )
        backlog = (
            self.db.scalar(
                select(func.count(ResponseCaseCandidate.id)).where(
                    ResponseCaseCandidate.status.in_(("pending_admin", "new"))
                )
            )
            or 0
        )
        approved = (
            self.db.scalar(
                select(func.count(ResponseCaseCandidate.id)).where(
                    ResponseCaseCandidate.status.in_(("approved", "merged"))
                )
            )
            or 0
        )
        rejected = (
            self.db.scalar(
                select(func.count(ResponseCaseCandidate.id)).where(
                    ResponseCaseCandidate.status == "rejected"
                )
            )
            or 0
        )
        decided = approved + rejected
        approval_rate = round(100.0 * approved / decided, 1) if decided else None

        total_reviews = self.db.scalar(select(func.count(Review.id))) or 0
        reviews_with_decision = (
            self.db.scalar(
                select(func.count(func.distinct(ResponseCaseDecision.review_id))).where(
                    ResponseCaseDecision.is_current.is_(True)
                )
            )
            or 0
        )
        coverage = (
            round(100.0 * reviews_with_decision / total_reviews, 1) if total_reviews else 0.0
        )

        return KbHealthMetrics(
            active_cases=active,
            archived_cases=archived,
            coverage_percent=coverage,
            candidate_backlog=backlog,
            approval_rate_percent=approval_rate,
            total_examples=examples,
            reviews_with_ch_decision=reviews_with_decision,
            total_reviews=total_reviews,
        )
