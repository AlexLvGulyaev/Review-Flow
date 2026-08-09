"""Smoke tests for CH approve guard after 024G1."""

from types import SimpleNamespace

import pytest

from app.services.controlled_hybrid.presenter import ch_approve_guard


def _resp(meta: dict):
    return SimpleNamespace(generation_metadata=meta)


def test_requires_confirmation_when_case_exists():
    with pytest.raises(Exception) as exc:
        ch_approve_guard(
            _resp(
                {
                    "pipeline": "controlled_hybrid",
                    "requires_operator_case_confirmation": True,
                    "operator_case_confirmed": False,
                    "response_case_id": "00000000-0000-0000-0000-000000000001",
                }
            )
        )
    assert "confirm the response case" in str(exc.value.detail)


def test_approve_allowed_after_no_case_fits_escalation():
    ch_approve_guard(
        _resp(
            {
                "pipeline": "controlled_hybrid",
                "requires_operator_case_confirmation": True,
                "operator_case_confirmed": False,
                "case_confirmation_not_required": True,
                "case_escalated": True,
            }
        )
    )


def test_other_escalation_reasons_still_require_confirmation():
    with pytest.raises(Exception) as exc:
        ch_approve_guard(
            _resp(
                {
                    "pipeline": "controlled_hybrid",
                    "requires_operator_case_confirmation": True,
                    "operator_case_confirmed": False,
                    "operator_editor_enabled": True,
                    "response_case_id": "00000000-0000-0000-0000-000000000001",
                }
            )
        )
    assert "confirm the response case" in str(exc.value.detail)
