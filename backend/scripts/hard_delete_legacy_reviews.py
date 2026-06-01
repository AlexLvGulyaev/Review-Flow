#!/usr/bin/env python3
"""
Physically delete legacy reviews through NL-00500001-002 (inclusive).

Usage:
  docker compose exec backend python scripts/hard_delete_legacy_reviews.py
  docker compose exec backend python scripts/hard_delete_legacy_reviews.py --dry-run
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, func, select, update

from app.db.session import SessionLocal
from app.models.ch_entities import ResponseCaseCandidate, ResponseCaseExample
from app.models.entities import OperationalLog, Review
LEGACY_CUTOFF_REQUEST_NUMBER = "NL-00500001-002"

DRY_RUN = "--dry-run" in sys.argv


def main() -> int:
    db = SessionLocal()
    try:
        cutoff_at = db.scalar(
            select(Review.created_at).where(
                Review.request_number == LEGACY_CUTOFF_REQUEST_NUMBER
            )
        )
        if cutoff_at is None:
            print(f"ERROR: cutoff review {LEGACY_CUTOFF_REQUEST_NUMBER} not found")
            return 1

        legacy_ids = list(
            db.scalars(select(Review.id).where(Review.created_at <= cutoff_at)).all()
        )
        legacy_numbers = list(
            db.scalars(
                select(Review.request_number).where(Review.created_at <= cutoff_at)
            ).all()
        )

        print(f"Cutoff timestamp: {cutoff_at} ({LEGACY_CUTOFF_REQUEST_NUMBER})")
        print(f"Legacy reviews to delete: {len(legacy_ids)}")
        for num in sorted(n or "" for n in legacy_numbers if n):
            print(f"  - {num}")

        if DRY_RUN:
            print("DRY RUN — no changes committed")
            return 0

        if legacy_ids:
            candidate_ids = list(
                db.scalars(
                    select(ResponseCaseCandidate.id).where(
                        ResponseCaseCandidate.review_id.in_(legacy_ids)
                    )
                ).all()
            )
            db.execute(
                update(ResponseCaseExample)
                .where(ResponseCaseExample.source_review_id.in_(legacy_ids))
                .values(source_review_id=None)
            )
            db.execute(
                delete(OperationalLog).where(
                    OperationalLog.entity_type == "review",
                    OperationalLog.entity_id.in_(legacy_ids),
                )
            )
            if candidate_ids:
                db.execute(
                    delete(OperationalLog).where(
                        OperationalLog.entity_type == "response_case_candidate",
                        OperationalLog.entity_id.in_(candidate_ids),
                    )
                )

        result = db.execute(delete(Review).where(Review.created_at <= cutoff_at))
        db.commit()

        remaining = (
            db.scalar(select(func.count(Review.id)).where(Review.created_at <= cutoff_at))
            or 0
        )
        print(f"Deleted reviews: {result.rowcount}")
        print(f"Remaining legacy count: {remaining}")
        return 0 if remaining == 0 else 1
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
