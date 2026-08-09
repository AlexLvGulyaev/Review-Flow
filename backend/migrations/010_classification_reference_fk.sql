-- Sprint 021A — classification reference data FK normalization

CREATE TABLE IF NOT EXISTS priority_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority_code VARCHAR(32) NOT NULL UNIQUE,
    priority_name VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO priority_levels (priority_code, priority_name, sort_order, description)
VALUES
    ('low', 'Низкий', 10, NULL),
    ('medium', 'Средний', 20, NULL),
    ('high', 'Высокий', 30, NULL),
    ('critical', 'Критический', 40, NULL)
ON CONFLICT (priority_code) DO UPDATE SET
    priority_name = EXCLUDED.priority_name,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE;

ALTER TABLE interaction_scenarios
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE sentiment_profiles
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- FK columns
ALTER TABLE review_phrase_patterns
    ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES interaction_scenarios(id),
    ADD COLUMN IF NOT EXISTS sentiment_id UUID REFERENCES sentiment_profiles(id),
    ADD COLUMN IF NOT EXISTS priority_id UUID REFERENCES priority_levels(id);

ALTER TABLE response_templates
    ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES interaction_scenarios(id),
    ADD COLUMN IF NOT EXISTS sentiment_id UUID REFERENCES sentiment_profiles(id),
    ADD COLUMN IF NOT EXISTS priority_id UUID REFERENCES priority_levels(id);

ALTER TABLE review_classifications
    ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES interaction_scenarios(id),
    ADD COLUMN IF NOT EXISTS sentiment_id UUID REFERENCES sentiment_profiles(id),
    ADD COLUMN IF NOT EXISTS priority_id UUID REFERENCES priority_levels(id);

ALTER TABLE rejection_feedback
    ADD COLUMN IF NOT EXISTS llm_scenario_id UUID REFERENCES interaction_scenarios(id),
    ADD COLUMN IF NOT EXISTS llm_sentiment_id UUID REFERENCES sentiment_profiles(id),
    ADD COLUMN IF NOT EXISTS llm_priority_id UUID REFERENCES priority_levels(id),
    ADD COLUMN IF NOT EXISTS operator_corrected_scenario_id UUID REFERENCES interaction_scenarios(id),
    ADD COLUMN IF NOT EXISTS operator_corrected_sentiment_id UUID REFERENCES sentiment_profiles(id),
    ADD COLUMN IF NOT EXISTS operator_corrected_priority_id UUID REFERENCES priority_levels(id);

-- Backfill review_phrase_patterns
UPDATE review_phrase_patterns p
SET scenario_id = s.id
FROM interaction_scenarios s
WHERE p.scenario_id IS NULL AND p.scenario IS NOT NULL AND s.scenario_code = p.scenario;

UPDATE review_phrase_patterns p
SET sentiment_id = sp.id
FROM sentiment_profiles sp
WHERE p.sentiment_id IS NULL AND p.sentiment IS NOT NULL AND sp.sentiment_code = p.sentiment;

UPDATE review_phrase_patterns p
SET priority_id = pl.id
FROM priority_levels pl
WHERE p.priority_id IS NULL AND p.priority_hint IS NOT NULL AND pl.priority_code = p.priority_hint;

-- Backfill response_templates
UPDATE response_templates t
SET scenario_id = s.id
FROM interaction_scenarios s
WHERE t.scenario_id IS NULL AND t.scenario IS NOT NULL AND s.scenario_code = t.scenario;

UPDATE response_templates t
SET sentiment_id = sp.id
FROM sentiment_profiles sp
WHERE t.sentiment_id IS NULL AND t.sentiment IS NOT NULL AND sp.sentiment_code = t.sentiment;

UPDATE response_templates t
SET priority_id = pl.id
FROM priority_levels pl
WHERE t.priority_id IS NULL AND t.priority IS NOT NULL AND pl.priority_code = t.priority;

-- Backfill review_classifications
UPDATE review_classifications c
SET scenario_id = s.id
FROM interaction_scenarios s
WHERE c.scenario_id IS NULL AND c.scenario IS NOT NULL AND s.scenario_code = c.scenario;

UPDATE review_classifications c
SET sentiment_id = sp.id
FROM sentiment_profiles sp
WHERE c.sentiment_id IS NULL AND c.sentiment IS NOT NULL AND sp.sentiment_code = c.sentiment;

UPDATE review_classifications c
SET priority_id = pl.id
FROM priority_levels pl
WHERE c.priority_id IS NULL AND c.priority IS NOT NULL AND pl.priority_code = c.priority;

-- Backfill rejection_feedback (llm_* and operator_corrected_*)
UPDATE rejection_feedback r
SET llm_scenario_id = s.id
FROM interaction_scenarios s
WHERE r.llm_scenario_id IS NULL AND r.llm_scenario IS NOT NULL AND s.scenario_code = r.llm_scenario;

UPDATE rejection_feedback r
SET llm_sentiment_id = sp.id
FROM sentiment_profiles sp
WHERE r.llm_sentiment_id IS NULL AND r.llm_tone IS NOT NULL AND sp.sentiment_code = r.llm_tone;

UPDATE rejection_feedback r
SET llm_priority_id = pl.id
FROM priority_levels pl
WHERE r.llm_priority_id IS NULL AND r.llm_priority IS NOT NULL AND pl.priority_code = r.llm_priority;

UPDATE rejection_feedback r
SET operator_corrected_scenario_id = s.id
FROM interaction_scenarios s
WHERE r.operator_corrected_scenario_id IS NULL AND r.operator_corrected_scenario IS NOT NULL
  AND s.scenario_code = r.operator_corrected_scenario;

UPDATE rejection_feedback r
SET operator_corrected_sentiment_id = sp.id
FROM sentiment_profiles sp
WHERE r.operator_corrected_sentiment_id IS NULL AND r.operator_corrected_tone IS NOT NULL
  AND sp.sentiment_code = r.operator_corrected_tone;

UPDATE rejection_feedback r
SET operator_corrected_priority_id = pl.id
FROM priority_levels pl
WHERE r.operator_corrected_priority_id IS NULL AND r.operator_corrected_priority IS NOT NULL
  AND pl.priority_code = r.operator_corrected_priority;

-- evaluation_results (if present from initial schema)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluation_results') THEN
        ALTER TABLE evaluation_results
            ADD COLUMN IF NOT EXISTS expected_scenario_id UUID REFERENCES interaction_scenarios(id),
            ADD COLUMN IF NOT EXISTS predicted_scenario_id UUID REFERENCES interaction_scenarios(id),
            ADD COLUMN IF NOT EXISTS expected_sentiment_id UUID REFERENCES sentiment_profiles(id),
            ADD COLUMN IF NOT EXISTS predicted_sentiment_id UUID REFERENCES sentiment_profiles(id),
            ADD COLUMN IF NOT EXISTS expected_priority_id UUID REFERENCES priority_levels(id),
            ADD COLUMN IF NOT EXISTS predicted_priority_id UUID REFERENCES priority_levels(id);

        UPDATE evaluation_results e SET expected_scenario_id = s.id
        FROM interaction_scenarios s
        WHERE e.expected_scenario_id IS NULL AND e.expected_scenario IS NOT NULL AND s.scenario_code = e.expected_scenario;

        UPDATE evaluation_results e SET predicted_scenario_id = s.id
        FROM interaction_scenarios s
        WHERE e.predicted_scenario_id IS NULL AND e.predicted_scenario IS NOT NULL AND s.scenario_code = e.predicted_scenario;

        UPDATE evaluation_results e SET expected_sentiment_id = sp.id
        FROM sentiment_profiles sp
        WHERE e.expected_sentiment_id IS NULL AND e.expected_sentiment IS NOT NULL AND sp.sentiment_code = e.expected_sentiment;

        UPDATE evaluation_results e SET predicted_sentiment_id = sp.id
        FROM sentiment_profiles sp
        WHERE e.predicted_sentiment_id IS NULL AND e.predicted_sentiment IS NOT NULL AND sp.sentiment_code = e.predicted_sentiment;

        UPDATE evaluation_results e SET expected_priority_id = pl.id
        FROM priority_levels pl
        WHERE e.expected_priority_id IS NULL AND e.expected_priority IS NOT NULL AND pl.priority_code = e.expected_priority;

        UPDATE evaluation_results e SET predicted_priority_id = pl.id
        FROM priority_levels pl
        WHERE e.predicted_priority_id IS NULL AND e.predicted_priority IS NOT NULL AND pl.priority_code = e.predicted_priority;
    END IF;
END $$;

-- Sync legacy string columns from FK (deprecated, read-only at runtime)
UPDATE review_phrase_patterns p SET
    scenario = s.scenario_code,
    sentiment = sp.sentiment_code,
    priority_hint = pl.priority_code
FROM interaction_scenarios s, sentiment_profiles sp, priority_levels pl
WHERE p.scenario_id = s.id AND p.sentiment_id = sp.id AND p.priority_id = pl.id;

UPDATE response_templates t SET
    scenario = s.scenario_code,
    sentiment = sp.sentiment_code,
    priority = pl.priority_code
FROM interaction_scenarios s, sentiment_profiles sp, priority_levels pl
WHERE t.scenario_id = s.id AND t.sentiment_id = sp.id AND t.priority_id = pl.id;

UPDATE review_classifications c SET
    scenario = s.scenario_code,
    sentiment = sp.sentiment_code,
    priority = pl.priority_code
FROM interaction_scenarios s, sentiment_profiles sp, priority_levels pl
WHERE c.scenario_id = s.id AND c.sentiment_id = sp.id AND c.priority_id = pl.id;

CREATE INDEX IF NOT EXISTS idx_review_phrase_patterns_scenario_id ON review_phrase_patterns(scenario_id);
CREATE INDEX IF NOT EXISTS idx_review_phrase_patterns_sentiment_id ON review_phrase_patterns(sentiment_id);
CREATE INDEX IF NOT EXISTS idx_review_phrase_patterns_priority_id ON review_phrase_patterns(priority_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_scenario_id ON response_templates(scenario_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_sentiment_id ON response_templates(sentiment_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_priority_id ON response_templates(priority_id);
CREATE INDEX IF NOT EXISTS idx_review_classifications_scenario_id ON review_classifications(scenario_id);
CREATE INDEX IF NOT EXISTS idx_review_classifications_sentiment_id ON review_classifications(sentiment_id);
CREATE INDEX IF NOT EXISTS idx_review_classifications_priority_id ON review_classifications(priority_id);
