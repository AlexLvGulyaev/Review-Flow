"""Tests for auto-learning from operator case confirmation (024G6)."""

import json
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.controlled_hybrid.auto_learning import (
    CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE,
    maybe_create_example_learning_candidate,
)


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def __iter__(self):
        return iter([])


class _Db:
    def __init__(self, *, case, existing=None, match_row=None):
        self.case = case
        self.existing = existing
        self.match_row = match_row
        self.added = []

    def get(self, model, obj_id):
        if obj_id == self.case.id:
            return self.case
        return None

    def scalar(self, _stmt):
        return self.existing

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        for obj in self.added:
            if not getattr(obj, "id", None):
                obj.id = uuid.uuid4()


def test_creates_example_candidate_when_score_below_threshold():
    case_id = uuid.uuid4()
    case = SimpleNamespace(id=case_id, case_code="gratitude_01", title="Благодарность", confidence_threshold=0.75)
    review = SimpleNamespace(id=uuid.uuid4(), review_text="Спасибо за доставку!")
    decision = SimpleNamespace(response_case_id=case_id, match_confidence=0.49)
    db = _Db(case=case)

    result = maybe_create_example_learning_candidate(db, review, decision)

    assert result is not None
    assert result.candidate_type == CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE
    assert result.target_response_case_id == case_id
    payload = json.loads(result.proposed_description)
    assert payload["match_score"] == 0.49
    assert payload["retrieval_threshold"] == 0.75
    assert abs(payload["gap"] - 0.26) < 0.0001
    assert payload["review_text"] == review.review_text


def test_skips_when_score_at_or_above_threshold():
    case_id = uuid.uuid4()
    case = SimpleNamespace(id=case_id, case_code="x", title="X", confidence_threshold=0.75)
    review = SimpleNamespace(id=uuid.uuid4(), review_text="text")
    decision = SimpleNamespace(response_case_id=case_id, match_confidence=0.80)
    db = _Db(case=case)

    assert maybe_create_example_learning_candidate(db, review, decision) is None
    assert db.added == []


def test_skips_duplicate_for_same_review_and_case():
    case_id = uuid.uuid4()
    case = SimpleNamespace(id=case_id, case_code="x", title="X", confidence_threshold=0.85)
    review = SimpleNamespace(id=uuid.uuid4(), review_text="text")
    decision = SimpleNamespace(response_case_id=case_id, match_confidence=0.42)
    existing = SimpleNamespace(id=uuid.uuid4())
    db = _Db(case=case, existing=existing)

    assert maybe_create_example_learning_candidate(db, review, decision) is None
