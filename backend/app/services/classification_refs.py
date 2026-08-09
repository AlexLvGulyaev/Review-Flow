from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import (
    InteractionScenario,
    PriorityLevel,
    ResponseTemplate,
    ReviewClassification,
    ReviewPhrasePattern,
    RejectionFeedback,
    SentimentProfile,
)
from app.schemas.reference import ClassificationRefOut


class ClassificationReferenceError(ValueError):
    pass


class ClassificationRefsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active_scenarios(self) -> list[InteractionScenario]:
        return list(
            self.db.scalars(
                select(InteractionScenario)
                .where(InteractionScenario.is_active.is_(True))
                .order_by(InteractionScenario.scenario_code)
            ).all()
        )

    def list_active_sentiments(self) -> list[SentimentProfile]:
        return list(
            self.db.scalars(
                select(SentimentProfile)
                .where(SentimentProfile.is_active.is_(True))
                .order_by(SentimentProfile.sentiment_code)
            ).all()
        )

    def list_active_priorities(self) -> list[PriorityLevel]:
        return list(
            self.db.scalars(
                select(PriorityLevel)
                .where(PriorityLevel.is_active.is_(True))
                .order_by(PriorityLevel.sort_order, PriorityLevel.priority_code)
            ).all()
        )

    def classification_reference_bundle(self) -> dict[str, list[ClassificationRefOut]]:
        return {
            "scenarios": [self.scenario_ref(s) for s in self.list_active_scenarios()],
            "sentiments": [self.sentiment_ref(s) for s in self.list_active_sentiments()],
            "priorities": [self.priority_ref(p) for p in self.list_active_priorities()],
        }

    @staticmethod
    def scenario_ref(row: InteractionScenario | None) -> ClassificationRefOut | None:
        if not row:
            return None
        return ClassificationRefOut(id=row.id, code=row.scenario_code, name=row.scenario_name)

    @staticmethod
    def sentiment_ref(row: SentimentProfile | None) -> ClassificationRefOut | None:
        if not row:
            return None
        return ClassificationRefOut(id=row.id, code=row.sentiment_code, name=row.sentiment_name)

    @staticmethod
    def priority_ref(row: PriorityLevel | None) -> ClassificationRefOut | None:
        if not row:
            return None
        return ClassificationRefOut(id=row.id, code=row.priority_code, name=row.priority_name)

    def get_scenario_by_id(self, ref_id: uuid.UUID) -> InteractionScenario:
        row = self.db.get(InteractionScenario, ref_id)
        if not row or not row.is_active:
            raise HTTPException(400, "Unknown or inactive scenario")
        return row

    def get_sentiment_by_id(self, ref_id: uuid.UUID) -> SentimentProfile:
        row = self.db.get(SentimentProfile, ref_id)
        if not row or not row.is_active:
            raise HTTPException(400, "Unknown or inactive sentiment")
        return row

    def get_priority_by_id(self, ref_id: uuid.UUID) -> PriorityLevel:
        row = self.db.get(PriorityLevel, ref_id)
        if not row or not row.is_active:
            raise HTTPException(400, "Unknown or inactive priority")
        return row

    def get_scenario_by_code(self, code: str) -> InteractionScenario | None:
        return self.db.scalars(
            select(InteractionScenario).where(
                InteractionScenario.scenario_code == code,
                InteractionScenario.is_active.is_(True),
            )
        ).first()

    def get_sentiment_by_code(self, code: str) -> SentimentProfile | None:
        return self.db.scalars(
            select(SentimentProfile).where(
                SentimentProfile.sentiment_code == code,
                SentimentProfile.is_active.is_(True),
            )
        ).first()

    def get_priority_by_code(self, code: str) -> PriorityLevel | None:
        return self.db.scalars(
            select(PriorityLevel).where(
                PriorityLevel.priority_code == code,
                PriorityLevel.is_active.is_(True),
            )
        ).first()

    def resolve_codes(self, scenario: str, sentiment: str, priority: str) -> tuple[
        InteractionScenario,
        SentimentProfile,
        PriorityLevel,
    ]:
        s = self.get_scenario_by_code(scenario)
        sp = self.get_sentiment_by_code(sentiment)
        pl = self.get_priority_by_code(priority)
        missing = []
        if not s:
            missing.append(f"scenario={scenario}")
        if not sp:
            missing.append(f"sentiment={sentiment}")
        if not pl:
            missing.append(f"priority={priority}")
        if missing:
            raise ClassificationReferenceError(
                "Unknown classification codes: " + ", ".join(missing)
            )
        return s, sp, pl

    def ref_for_scenario_id(self, ref_id: uuid.UUID | None) -> ClassificationRefOut | None:
        if not ref_id:
            return None
        return self.scenario_ref(self.db.get(InteractionScenario, ref_id))

    def ref_for_sentiment_id(self, ref_id: uuid.UUID | None) -> ClassificationRefOut | None:
        if not ref_id:
            return None
        return self.sentiment_ref(self.db.get(SentimentProfile, ref_id))

    def ref_for_priority_id(self, ref_id: uuid.UUID | None) -> ClassificationRefOut | None:
        if not ref_id:
            return None
        return self.priority_ref(self.db.get(PriorityLevel, ref_id))

    def classification_out_refs(
        self, cls: ReviewClassification
    ) -> tuple[ClassificationRefOut | None, ClassificationRefOut | None, ClassificationRefOut | None]:
        return (
            self.ref_for_scenario_id(cls.scenario_id),
            self.ref_for_sentiment_id(cls.sentiment_id),
            self.ref_for_priority_id(cls.priority_id),
        )

    def code_for_scenario_id(self, ref_id: uuid.UUID | None) -> str | None:
        row = self.db.get(InteractionScenario, ref_id) if ref_id else None
        return row.scenario_code if row else None

    def code_for_sentiment_id(self, ref_id: uuid.UUID | None) -> str | None:
        row = self.db.get(SentimentProfile, ref_id) if ref_id else None
        return row.sentiment_code if row else None

    def code_for_priority_id(self, ref_id: uuid.UUID | None) -> str | None:
        row = self.db.get(PriorityLevel, ref_id) if ref_id else None
        return row.priority_code if row else None

    @staticmethod
    def sync_phrase_legacy(p: ReviewPhrasePattern, scenario: InteractionScenario | None, sentiment: SentimentProfile | None, priority: PriorityLevel | None) -> None:
        p.scenario = scenario.scenario_code if scenario else None
        p.sentiment = sentiment.sentiment_code if sentiment else None
        p.priority_hint = priority.priority_code if priority else None

    @staticmethod
    def sync_template_legacy(
        t: ResponseTemplate,
        scenario: InteractionScenario | None,
        sentiment: SentimentProfile | None,
        priority: PriorityLevel | None,
    ) -> None:
        t.scenario = scenario.scenario_code if scenario else None
        t.sentiment = sentiment.sentiment_code if sentiment else None
        t.priority = priority.priority_code if priority else None

    @staticmethod
    def sync_classification_legacy(
        c: ReviewClassification,
        scenario: InteractionScenario | None,
        sentiment: SentimentProfile | None,
        priority: PriorityLevel | None,
    ) -> None:
        c.scenario = scenario.scenario_code if scenario else None
        c.sentiment = sentiment.sentiment_code if sentiment else None
        c.priority = priority.priority_code if priority else None

    @staticmethod
    def sync_rejection_feedback_legacy(
        row: RejectionFeedback,
        *,
        llm_scenario: InteractionScenario | None,
        llm_sentiment: SentimentProfile | None,
        llm_priority: PriorityLevel | None,
        corrected_scenario: InteractionScenario | None,
        corrected_sentiment: SentimentProfile | None,
        corrected_priority: PriorityLevel | None,
    ) -> None:
        row.llm_scenario = llm_scenario.scenario_code if llm_scenario else None
        row.llm_tone = llm_sentiment.sentiment_code if llm_sentiment else None
        row.llm_priority = llm_priority.priority_code if llm_priority else None
        row.operator_corrected_scenario = (
            corrected_scenario.scenario_code if corrected_scenario else None
        )
        row.operator_corrected_tone = (
            corrected_sentiment.sentiment_code if corrected_sentiment else None
        )
        row.operator_corrected_priority = (
            corrected_priority.priority_code if corrected_priority else None
        )
