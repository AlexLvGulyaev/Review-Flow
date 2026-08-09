#!/usr/bin/env python3
"""
Revert erroneous candidate_merge backfill for NL-00250012-001 (example-candidate).

Usage:
  docker compose exec backend python scripts/revert_candidate_merge_courier.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.ch_entities import ResponseCase
from app.models.entities import Review
from app.services.controlled_hybrid.candidate_learning import restore_review_decision_and_retrieval

REVIEW_REQUEST_NUMBER = "NL-00250012-001"
CASE_TITLE = "Жалоба на курьера"
RESTORED_SCORE = 0.6531
RESTORED_SOURCE = "retrieval_operator"
RESTORED_BAND = "low"


def main() -> int:
    db = SessionLocal()
    try:
        review = db.scalar(
            select(Review).where(Review.request_number == REVIEW_REQUEST_NUMBER)
        )
        if not review:
            print("ERROR: review not found")
            return 1

        case = db.scalar(select(ResponseCase).where(ResponseCase.title == CASE_TITLE))
        if not case:
            print("ERROR: response case not found")
            return 1

        decision_id = restore_review_decision_and_retrieval(
            db,
            review=review,
            response_case=case,
            decision_source=RESTORED_SOURCE,
            match_score=RESTORED_SCORE,
            confidence_band=RESTORED_BAND,
        )
        db.commit()

        print("OK")
        print(f"  review_id={review.id}")
        print(f"  request_number={review.request_number}")
        print(f"  decision_id={decision_id}")
        print(f"  decision_source={RESTORED_SOURCE}")
        print(f"  match_score={RESTORED_SCORE}")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
