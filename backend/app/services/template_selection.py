import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import ResponseTemplate
from app.schemas.classification import ClassificationResult


class TemplateSelectionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def select(self, classification: ClassificationResult) -> tuple[ResponseTemplate, int]:
        start = time.perf_counter()
        templates = self.db.scalars(
            select(ResponseTemplate).where(ResponseTemplate.is_active.is_(True))
        ).all()

        if not templates:
            raise RuntimeError("No active response templates in database")

        def score(t: ResponseTemplate, *, require_priority: bool) -> int:
            s = 0
            if t.scenario == classification.scenario:
                s += 4
            if t.sentiment == classification.sentiment:
                s += 2
            if require_priority and t.priority == classification.priority:
                s += 1
            return s

        # 1. scenario + sentiment + priority
        ranked = sorted(
            templates,
            key=lambda t: score(t, require_priority=True),
            reverse=True,
        )
        selected: ResponseTemplate
        if ranked[0] and score(ranked[0], require_priority=True) >= 7:
            selected = ranked[0]
        else:
            # 2. scenario + sentiment
            ranked = sorted(templates, key=lambda t: score(t, require_priority=False), reverse=True)
            if ranked[0] and score(ranked[0], require_priority=False) >= 6:
                selected = ranked[0]
            else:
                # 3. scenario only
                scenario_only = [t for t in templates if t.scenario == classification.scenario]
                if scenario_only:
                    selected = scenario_only[0]
                else:
                    # 4. admin-marked fallback or generic safe template
                    generic = next((t for t in templates if t.is_fallback), None)
                    if not generic:
                        generic = next(
                            (
                                t
                                for t in templates
                                if t.scenario == "question" and t.sentiment == "neutral"
                            ),
                            None,
                        )
                    selected = generic or templates[0]

        latency_ms = int((time.perf_counter() - start) * 1000)
        return selected, latency_ms
