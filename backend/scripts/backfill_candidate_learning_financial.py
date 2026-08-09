#!/usr/bin/env python3
"""
Backfill candidate_learning for review NL-00250005-001 → TS «Общий вопрос о компании».

Usage (from repo root):
  docker compose exec backend python scripts/backfill_candidate_learning_financial.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.ch_entities import ResponseCase
from app.models.entities import Review
from app.services.controlled_hybrid.candidate_learning import (
    apply_candidate_learning_classification,
    DECISION_SOURCE_CANDIDATE_LEARNING,
)

REVIEW_REQUEST_NUMBER = "NL-00250005-001"
REVIEW_TEXT_SNIPPET = "прибыль NL по финансовому отчету"
CASE_TITLE = "Общий вопрос о компании"


def main() -> int:
    db = SessionLocal()
    try:
        review = db.scalar(
            select(Review).where(Review.request_number == REVIEW_REQUEST_NUMBER)
        ) or db.scalar(
            select(Review).where(Review.review_text.ilike(f"%{REVIEW_TEXT_SNIPPET}%"))
        )
        if not review:
            print("ERROR: review not found")
            return 1

        case = db.scalar(select(ResponseCase).where(ResponseCase.title == CASE_TITLE))
        if not case:
            print("ERROR: response case not found")
            return 1

        decision_id = apply_candidate_learning_classification(
            db,
            review=review,
            response_case=case,
            preserve_published_response=True,
        )
        db.commit()

        print("OK")
        print(f"  review_id={review.id}")
        print(f"  request_number={review.request_number}")
        print(f"  response_case_id={case.id}")
        print(f"  decision_id={decision_id}")
        print(f"  decision_source={DECISION_SOURCE_CANDIDATE_LEARNING}")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
