-- Sprint 023C: persisted CH search / confidence UI settings (singleton row)

CREATE TABLE IF NOT EXISTS ch_runtime_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    retrieval_top_n INTEGER NOT NULL DEFAULT 5,
    minimum_match_score NUMERIC(5, 4) NOT NULL DEFAULT 0,
    confidence_medium_delta NUMERIC(5, 4) NOT NULL DEFAULT 0.10,
    default_confidence_threshold NUMERIC(5, 4) NOT NULL DEFAULT 0.75,
    draft_on_medium BOOLEAN NOT NULL DEFAULT TRUE,
    auto_decision_on_high BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ch_runtime_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
