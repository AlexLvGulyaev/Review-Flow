import time
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import InteractionScenario, ResponseTemplate, SentimentProfile


class TemplateSelectionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def select(
        self,
        *,
        scenario_id: uuid.UUID,
        sentiment_id: uuid.UUID,
        priority_id: uuid.UUID,
    ) -> tuple[ResponseTemplate, int]:
        start = time.perf_counter()
        templates = self.db.scalars(
            select(ResponseTemplate).where(ResponseTemplate.is_active.is_(True))
        ).all()

        if not templates:
            raise RuntimeError("No active response templates in database")

        fallback_scenario_id = self._fallback_scenario_id()
        fallback_sentiment_id = self._fallback_sentiment_id()

        def score(t: ResponseTemplate, *, require_priority: bool) -> int:
            s = 0
            if t.scenario_id == scenario_id:
                s += 4
            if t.sentiment_id == sentiment_id:
                s += 2
            if require_priority and t.priority_id == priority_id:
                s += 1
            return s

        ranked = sorted(
            templates,
            key=lambda t: score(t, require_priority=True),
            reverse=True,
        )
        selected: ResponseTemplate
        if ranked[0] and score(ranked[0], require_priority=True) >= 7:
            selected = ranked[0]
        else:
            ranked = sorted(templates, key=lambda t: score(t, require_priority=False), reverse=True)
            if ranked[0] and score(ranked[0], require_priority=False) >= 6:
                selected = ranked[0]
            else:
                scenario_only = [t for t in templates if t.scenario_id == scenario_id]
                if scenario_only:
                    selected = scenario_only[0]
                else:
                    generic = next((t for t in templates if t.is_fallback), None)
                    if not generic and fallback_scenario_id and fallback_sentiment_id:
                        generic = next(
                            (
                                t
                                for t in templates
                                if t.scenario_id == fallback_scenario_id
                                and t.sentiment_id == fallback_sentiment_id
                            ),
                            None,
                        )
                    selected = generic or templates[0]

        latency_ms = int((time.perf_counter() - start) * 1000)
        return selected, latency_ms

    def _fallback_scenario_id(self) -> uuid.UUID | None:
        row = self.db.scalars(
            select(InteractionScenario.id).where(
                InteractionScenario.scenario_code == "question",
                InteractionScenario.is_active.is_(True),
            )
        ).first()
        return row

    def _fallback_sentiment_id(self) -> uuid.UUID | None:
        row = self.db.scalars(
            select(SentimentProfile.id).where(
                SentimentProfile.sentiment_code == "neutral",
                SentimentProfile.is_active.is_(True),
            )
        ).first()
        return row
