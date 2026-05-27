import time
import uuid
from dataclasses import dataclass

from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import ReviewPhrasePattern


@dataclass
class PhraseMatchResult:
    matched_phrase_id: uuid.UUID | None
    phrase_match_score: float
    classification_source: str
    needs_phrase_review: bool
    matched_phrase: ReviewPhrasePattern | None


class PhraseMatchingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def match(self, review_text: str) -> tuple[PhraseMatchResult, int]:
        start = time.perf_counter()
        patterns = self.db.scalars(
            select(ReviewPhrasePattern).where(ReviewPhrasePattern.is_active.is_(True))
        ).all()

        best: ReviewPhrasePattern | None = None
        best_score = 0.0
        normalized_review = review_text.lower().strip()

        for pattern in patterns:
            score = fuzz.token_set_ratio(normalized_review, pattern.phrase_text.lower())
            if score > best_score:
                best_score = score
                best = pattern

        threshold = settings.phrase_match_threshold
        latency_ms = int((time.perf_counter() - start) * 1000)
        if best and best_score >= threshold:
            return (
                PhraseMatchResult(
                    matched_phrase_id=best.id,
                    phrase_match_score=round(best_score / 100, 4),
                    classification_source="phrase_match",
                    needs_phrase_review=False,
                    matched_phrase=best,
                ),
                latency_ms,
            )

        return (
            PhraseMatchResult(
                matched_phrase_id=None,
                phrase_match_score=round(best_score / 100, 4) if best_score else 0.0,
                classification_source="llm_fallback",
                needs_phrase_review=True,
                matched_phrase=best if best_score > 0 else None,
            ),
            latency_ms,
        )
