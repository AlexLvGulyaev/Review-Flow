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


def evaluate_confidence(
    match_score: float,
    confidence_threshold: Decimal | float,
    *,
    medium_delta: float | None = None,
) -> ConfidenceEvaluation:
    threshold = float(confidence_threshold)
    delta = (
        medium_delta
        if medium_delta is not None
        else settings.ch_confidence_medium_delta
    )
    medium_floor = max(0.0, threshold - delta)
    if match_score >= threshold:
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
    )
