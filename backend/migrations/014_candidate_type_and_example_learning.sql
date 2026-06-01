-- 024G6: candidate types for auto-learning from operator confirmation

ALTER TABLE response_case_candidates
    ADD COLUMN IF NOT EXISTS candidate_type VARCHAR(32) NOT NULL DEFAULT 'new_response_case';

ALTER TABLE response_case_candidates
    ADD COLUMN IF NOT EXISTS target_response_case_id UUID REFERENCES response_cases(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_response_case_candidates_example_learning
    ON response_case_candidates (review_id, target_response_case_id)
    WHERE candidate_type = 'response_case_example'
      AND target_response_case_id IS NOT NULL;
