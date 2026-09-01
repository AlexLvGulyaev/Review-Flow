from app.services.controlled_hybrid.confidence import ConfidenceBand, evaluate_confidence


# --- Recalibrated absolute path (threshold, no runner-up info) ---------------


def test_absolute_high_when_score_meets_threshold():
    res = evaluate_confidence(0.91, 0.60)
    assert res.band is ConfidenceBand.HIGH


def test_single_candidate_below_threshold_is_never_high():
    # No runner-up -> no relative evidence; only the threshold path can give HIGH.
    res = evaluate_confidence(0.65, 0.85)
    assert res.band is not ConfidenceBand.HIGH
    assert res.match_gap is None


# --- Gap-based relative path -------------------------------------------------


def test_gap_path_rescues_lexically_weak_but_clear_pick():
    # Owner case NL-00250112-001: confirmed correct top-1, score 0.65 vs
    # per-case threshold 0.85 -> previously LOW, now HIGH via clear lead.
    res = evaluate_confidence(0.65, 0.85, runner_up_score=0.51, score_floor=0.45, gap_high=0.10)
    assert res.band is ConfidenceBand.HIGH
    assert res.match_gap == 0.14


def test_tight_race_is_medium_even_with_decent_score():
    # Above medium_floor, above floor, but the runner-up is right behind.
    res = evaluate_confidence(0.80, 0.85, runner_up_score=0.79, score_floor=0.45, gap_high=0.10)
    assert res.band is ConfidenceBand.MEDIUM


# --- Junk floor ---------------------------------------------------------------


def test_score_below_floor_is_low_regardless_of_gap():
    res = evaluate_confidence(0.30, 0.60, runner_up_score=0.05, score_floor=0.45, gap_high=0.10)
    assert res.band is ConfidenceBand.LOW


def test_between_floor_and_medium_floor_is_low_when_race_tight():
    # threshold 0.60, delta 0.10 -> medium_floor 0.50; 0.49 stays LOW because
    # the lead over the runner-up is negligible.
    res = evaluate_confidence(0.49, 0.60, runner_up_score=0.45, score_floor=0.45, gap_high=0.10)
    assert res.band is ConfidenceBand.LOW


def test_between_floor_and_medium_floor_is_high_when_lead_clear():
    res = evaluate_confidence(0.49, 0.60, runner_up_score=0.30, score_floor=0.45, gap_high=0.10)
    assert res.band is ConfidenceBand.HIGH


# --- Legacy behavior preserved -----------------------------------------------


def test_legacy_delta_banding_still_applies_without_floor_inputs():
    # No floor/gap overrides -> settings defaults (0.45 / 0.10); legacy
    # medium zone [medium_floor, threshold) still works.
    res = evaluate_confidence(0.70, 0.75)
    assert res.band is ConfidenceBand.MEDIUM
    assert res.medium_floor == 0.65


def test_legacy_low_below_medium_floor():
    res = evaluate_confidence(0.55, 0.95, medium_delta=0.10)
    assert res.band is ConfidenceBand.LOW


def test_defaults_from_settings():
    from app.core.config import settings

    assert settings.ch_confidence_score_floor == 0.45
    assert settings.ch_confidence_gap_high == 0.10