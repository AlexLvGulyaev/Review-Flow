"""Tests for no_case_fits final decision semantics (024G5)."""

import uuid
from types import SimpleNamespace
from unittest.mock import patch

from app.services.controlled_hybrid.presenter import (
    NO_CASE_FITS_ESCALATION,
    build_selected_case_out,
    is_no_case_fits_state,
    resolve_operator_list_classification,
)


def test_is_no_case_fits_when_escalated_without_override():
    review_id = uuid.uuid4()
    meta = {"case_escalated": True, "escalation_reason": NO_CASE_FITS_ESCALATION}
    db = SimpleNamespace()

    with patch("app.services.controlled_hybrid.presenter.get_current_decision") as get_decision:
        get_decision.return_value = SimpleNamespace(is_operator_override=False)
        assert is_no_case_fits_state(db, review_id, meta) is True


def test_is_no_case_fits_false_after_candidate_learning():
    review_id = uuid.uuid4()
    meta = {"case_escalated": True, "escalation_reason": NO_CASE_FITS_ESCALATION}
    db = SimpleNamespace()

    with patch("app.services.controlled_hybrid.presenter.get_current_decision") as get_decision:
        get_decision.return_value = SimpleNamespace(
            is_operator_override=False,
            decision_source="candidate_learning",
        )
        assert is_no_case_fits_state(db, review_id, meta) is False


def test_is_no_case_fits_false_after_candidate_merge():
    review_id = uuid.uuid4()
    meta = {"case_escalated": True, "escalation_reason": NO_CASE_FITS_ESCALATION}
    db = SimpleNamespace()

    with patch("app.services.controlled_hybrid.presenter.get_current_decision") as get_decision:
        get_decision.return_value = SimpleNamespace(
            is_operator_override=False,
            decision_source="candidate_merge",
        )
        assert is_no_case_fits_state(db, review_id, meta) is False


def test_should_not_apply_merge_for_example_candidate():
    from app.services.controlled_hybrid.auto_learning import CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE
    from app.services.controlled_hybrid.candidate_learning import should_apply_merge_classification

    review = SimpleNamespace(id=uuid.uuid4())
    candidate = SimpleNamespace(candidate_type=CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE)
    db = SimpleNamespace()

    assert should_apply_merge_classification(db, review, candidate) is False


def test_is_no_case_fits_false_after_operator_override():
    review_id = uuid.uuid4()
    meta = {"case_escalated": True}
    db = SimpleNamespace()

    with patch("app.services.controlled_hybrid.presenter.get_current_decision") as get_decision:
        get_decision.return_value = SimpleNamespace(is_operator_override=True)
        assert is_no_case_fits_state(db, review_id, meta) is False


def test_build_selected_case_out_hidden_after_no_case_fits():
    review_id = uuid.uuid4()
    case_id = uuid.uuid4()
    resp = SimpleNamespace(
        generation_metadata={
            "pipeline": "controlled_hybrid",
            "case_escalated": True,
            "escalation_reason": NO_CASE_FITS_ESCALATION,
        }
    )
    decision = SimpleNamespace(
        response_case_id=case_id,
        match_confidence=0.42,
        decision_source="retrieval_auto",
        is_operator_override=False,
    )
    db = SimpleNamespace(get=lambda *_a, **_k: SimpleNamespace(id=case_id, confidence_threshold=0.5))

    with patch("app.services.controlled_hybrid.presenter.get_current_decision"):
        result = build_selected_case_out(db, decision, resp, review_id)

    assert result is None


def test_list_classification_uses_operator_cls_after_no_case_fits():
    scenario_id = uuid.uuid4()
    cls = SimpleNamespace(
        scenario_id=scenario_id,
        sentiment_id=uuid.uuid4(),
        priority_id=uuid.uuid4(),
        scenario=None,
        sentiment=None,
        priority=None,
    )
    review = SimpleNamespace(id=uuid.uuid4(), classifications=[cls])
    resp = SimpleNamespace(
        generation_metadata={
            "pipeline": "controlled_hybrid",
            "case_escalated": True,
            "escalation_reason": NO_CASE_FITS_ESCALATION,
        }
    )
    refs = SimpleNamespace(
        code_for_scenario_id=lambda _id: "question",
        code_for_sentiment_id=lambda _id: "neutral",
        code_for_priority_id=lambda _id: "low",
    )

    with patch("app.services.controlled_hybrid.presenter.get_current_decision") as get_decision:
        get_decision.return_value = SimpleNamespace(
            response_case_id=uuid.uuid4(),
            is_operator_override=False,
        )
        scenario, sentiment, priority = resolve_operator_list_classification(
            SimpleNamespace(get=lambda *_a, **_k: None),
            review,
            resp,
            refs,
        )

    assert scenario == "question"
    assert sentiment == "neutral"
    assert priority == "low"
