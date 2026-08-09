-- Sprint 020G — operator AI draft rejection feedback

CREATE TABLE IF NOT EXISTS rejection_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    operator_id VARCHAR(128) NOT NULL DEFAULT 'operator-ui',
    rejection_reason VARCHAR(64) NOT NULL,
    llm_scenario VARCHAR(64),
    llm_tone VARCHAR(64),
    llm_priority VARCHAR(32),
    operator_corrected_scenario VARCHAR(64),
    operator_corrected_tone VARCHAR(64),
    operator_corrected_priority VARCHAR(32),
    optional_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rejection_feedback_review_id ON rejection_feedback(review_id);
