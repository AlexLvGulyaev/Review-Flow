from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum

from app.core.config import settings


class ConfidenceBand(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True)
class ConfidenceEvaluation:
    band: ConfidenceBand
    match_score: float
    threshold: float
    medium_floor: float

    runner_up_score: float | None = None
    match_gap: float | None = None


def evaluate_confidence(
    match_score: float,
    confidence_threshold: Decimal | float,
    *,
    medium_delta: float | None = None,
    runner_up_score: float | None = None,
    score_floor: float | None = None,
    gap_high: float | None = None,
) -> ConfidenceEvaluation:
    """Qualitative confidence band for the retrieved top-1 case.

    token_set_ratio is a lexical measure; its absolute value never maps to a
    "probability of a correct pick" (a right case against colloquial phrasing
    scores ~0.6). The band is therefore derived from:

    - score_floor: below it the match is junk (LOW) regardless of the gap;
    - threshold: absolute self-sufficient match (HIGH, legacy path);
    - match_gap: top-1 vs runner-up separation — a clear lead over the best
      alternative means the pick is unambiguous (HIGH, relative path).

    The LLM is never involved in scoring: the band is plain arithmetic.
    """
    threshold = float(confidence_threshold)
    delta = (
        medium_delta
        if medium_delta is not None
        else settings.ch_confidence_medium_delta
    )
    medium_floor = max(0.0, threshold - delta)
    floor = (
        score_floor
        if score_floor is not None
        else settings.ch_confidence_score_floor
    )
    gap_threshold = (
        gap_high
        if gap_high is not None
        else settings.ch_confidence_gap_high
    )
    gap = None if runner_up_score is None else match_score - float(runner_up_score)

    if match_score < floor:
        band = ConfidenceBand.LOW
    elif match_score >= threshold:
        band = ConfidenceBand.HIGH
    elif gap is not None and gap >= gap_threshold:
        band = ConfidenceBand.HIGH
    elif match_score >= medium_floor:
        band = ConfidenceBand.MEDIUM
    else:
        band = ConfidenceBand.LOW

    return ConfidenceEvaluation(
        band=band,
        match_score=match_score,
        threshold=threshold,
        medium_floor=medium_floor,
        runner_up_score=runner_up_score,
        match_gap=gap,
    )