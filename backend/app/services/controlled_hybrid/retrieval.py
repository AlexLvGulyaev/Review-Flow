from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.ch_entities import ResponseCase, ResponseCaseExample
from app.services.ch_runtime_settings import ChRuntimeSettingsService


@dataclass(frozen=True)
class RetrievedCaseCandidate:
    response_case: ResponseCase
    match_score: float
    best_example_id: uuid.UUID | None
    best_example_text: str | None


@dataclass(frozen=True)
class RetrievalResult:
    candidates: list[RetrievedCaseCandidate]
    latency_ms: int


class ResponseCaseRetrievalService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def retrieve(self, review_text: str) -> RetrievalResult:
        start = time.perf_counter()
        normalized_review = review_text.lower().strip()
        top_n = ChRuntimeSettingsService(self.db).effective().retrieval_top_n

        examples = self.db.scalars(
            select(ResponseCaseExample)
            .join(ResponseCase, ResponseCaseExample.response_case_id == ResponseCase.id)
            .where(
                ResponseCaseExample.is_active.is_(True),
                ResponseCase.is_active.is_(True),
            )
            .options(joinedload(ResponseCaseExample.response_case))
        ).all()

        best_per_case: dict[uuid.UUID, tuple[float, ResponseCaseExample | None]] = {}
        for example in examples:
            case = example.response_case
            if not case or not case.is_active:
                continue
            score = fuzz.token_set_ratio(normalized_review, example.example_text.lower()) / 100.0
            prev = best_per_case.get(case.id)
            if prev is None or score > prev[0]:
                best_per_case[case.id] = (round(score, 4), example)

        ranked: list[RetrievedCaseCandidate] = []
        for case_id, (score, example) in best_per_case.items():
            case = example.response_case if example else None
            if case is None:
                continue
            ranked.append(
                RetrievedCaseCandidate(
                    response_case=case,
                    match_score=score,
                    best_example_id=example.id if example else None,
                    best_example_text=example.example_text if example else None,
                )
            )

        ranked.sort(key=lambda c: c.match_score, reverse=True)
        ranked = ranked[:top_n]

        latency_ms = int((time.perf_counter() - start) * 1000)
        return RetrievalResult(candidates=ranked, latency_ms=latency_ms)
