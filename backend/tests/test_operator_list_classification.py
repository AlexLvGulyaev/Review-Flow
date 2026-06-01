"""Tests for CH operator queue classification resolution."""

import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.services.controlled_hybrid.presenter import resolve_operator_list_classification


class _Refs:
    def __init__(self, case):
        self.case = case

    def code_for_scenario_id(self, ref_id):
        return "gratitude" if ref_id == self.case.scenario_id else None

    def code_for_sentiment_id(self, ref_id):
        return "positive" if ref_id == self.case.sentiment_id else None

    def code_for_priority_id(self, ref_id):
        return "low" if ref_id == self.case.priority_id else None


def test_ch_uses_current_decision_case_not_stale_classification():
    case_id = uuid.uuid4()
    case = SimpleNamespace(
        id=case_id,
        scenario_id=uuid.uuid4(),
        sentiment_id=uuid.uuid4(),
        priority_id=uuid.uuid4(),
    )
    refs = _Refs(case)
    review = SimpleNamespace(id=uuid.uuid4(), classifications=[])
    resp = SimpleNamespace(generation_metadata={"pipeline": "controlled_hybrid"})
    decision = SimpleNamespace(response_case_id=case_id, is_operator_override=True)

    db = SimpleNamespace(
        get=lambda _model, cid: case if cid == case_id else None,
    )

    with patch(
        "app.services.controlled_hybrid.presenter.get_current_decision",
        return_value=decision,
    ):
        scenario, sentiment, priority = resolve_operator_list_classification(db, review, resp, refs)

    assert scenario == "gratitude"
    assert sentiment == "positive"
    assert priority == "low"


def test_legacy_falls_back_to_review_classification():
    refs = SimpleNamespace(
        code_for_scenario_id=lambda _id: "complaint",
        code_for_sentiment_id=lambda _id: "negative",
        code_for_priority_id=lambda _id: "high",
    )
    cls = SimpleNamespace(
        scenario_id=uuid.uuid4(),
        sentiment_id=uuid.uuid4(),
        priority_id=uuid.uuid4(),
        scenario=None,
        sentiment=None,
        priority=None,
    )
    review = SimpleNamespace(id=uuid.uuid4(), classifications=[cls])
    resp = SimpleNamespace(generation_metadata={"pipeline": "legacy"})

    scenario, sentiment, priority = resolve_operator_list_classification(
        SimpleNamespace(get=lambda *_a, **_k: None),
        review,
        resp,
        refs,
    )

    assert scenario == "complaint"
    assert sentiment == "negative"
    assert priority == "high"
