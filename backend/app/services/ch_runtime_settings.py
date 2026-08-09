from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ch_entities import ChRuntimeSettings


@dataclass(frozen=True)
class EffectiveChRuntimeSettings:
    retrieval_top_n: int
    minimum_match_score: float
    confidence_medium_delta: float
    default_confidence_threshold: float
    draft_on_medium: bool
    auto_decision_on_high: bool


class ChRuntimeSettingsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_row(self) -> ChRuntimeSettings:
        row = self.db.get(ChRuntimeSettings, 1)
        if row is None:
            row = ChRuntimeSettings(
                id=1,
                retrieval_top_n=settings.ch_retrieval_top_n,
                minimum_match_score=0,
                confidence_medium_delta=settings.ch_confidence_medium_delta,
                default_confidence_threshold=0.75,
                draft_on_medium=True,
                auto_decision_on_high=True,
                updated_at=datetime.now(timezone.utc),
            )
            self.db.add(row)
            self.db.flush()
        return row

    def effective(self) -> EffectiveChRuntimeSettings:
        row = self.get_row()
        return EffectiveChRuntimeSettings(
            retrieval_top_n=int(row.retrieval_top_n),
            minimum_match_score=float(row.minimum_match_score),
            confidence_medium_delta=float(row.confidence_medium_delta),
            default_confidence_threshold=float(row.default_confidence_threshold),
            draft_on_medium=bool(row.draft_on_medium),
            auto_decision_on_high=bool(row.auto_decision_on_high),
        )

    def update(self, patch: dict) -> ChRuntimeSettings:
        row = self.get_row()
        for key, value in patch.items():
            if value is not None:
                setattr(row, key, value)
        row.updated_at = datetime.now(timezone.utc)
        self.db.flush()
        return row
