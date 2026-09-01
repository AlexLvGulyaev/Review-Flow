-- 017: Confidence banding calibrated on lexical retrieval scores.
--
-- token_set_ratio is not a probability: operator-confirmed top-1 matches score
-- 0.48-0.71 and never reach the previous 0.75/0.85 thresholds, so correct picks
-- were systematically labeled "low confidence". Bands are now derived from an
-- absolute junk floor and the top-1 vs runner-up gap, in addition to the
-- (recalibrated) per-case threshold.

ALTER TABLE ch_runtime_settings
    ADD COLUMN IF NOT EXISTS confidence_score_floor NUMERIC(5, 4) NOT NULL DEFAULT 0.45,
    ADD COLUMN IF NOT EXISTS confidence_gap_high NUMERIC(5, 4) NOT NULL DEFAULT 0.10;

-- Default threshold recalibrated to the confirmed-match range (0.48-0.71).
UPDATE ch_runtime_settings SET default_confidence_threshold = 0.60
WHERE default_confidence_threshold > 0.60;

-- Reviews always land on the operator queue for confirmation, regardless of band.
UPDATE ch_runtime_settings SET auto_decision_on_high = false;

-- Per-case thresholds aligned with the same calibration (only stale
-- 0.75-0.85 values are lowered; admin-set values below stay untouched).
UPDATE response_cases SET confidence_threshold = 0.60
WHERE confidence_threshold >= 0.75;