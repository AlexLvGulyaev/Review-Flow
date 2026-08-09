-- Milestone 4: prompt registry + evaluation foundation

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS prompt_key TEXT;
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS version INTEGER;
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS user_prompt_template TEXT;
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE prompt_versions
SET
    prompt_key = COALESCE(prompt_key, 'review_classification'),
    version = COALESCE(version, 1),
    title = COALESCE(title, 'Initial classification'),
    system_prompt = COALESCE(system_prompt, prompt_text),
    user_prompt_template = COALESCE(user_prompt_template, '{{review_payload}}'),
    updated_at = NOW()
WHERE prompt_key IS NULL OR system_prompt IS NULL;

UPDATE prompt_versions SET is_active = FALSE WHERE prompt_key = 'review_classification';
UPDATE prompt_versions
SET is_active = TRUE
WHERE prompt_key = 'review_classification'
  AND id = (SELECT id FROM prompt_versions WHERE prompt_key = 'review_classification' ORDER BY version NULLS LAST, created_at LIMIT 1);

INSERT INTO prompt_versions (
    prompt_key, version, title, system_prompt, user_prompt_template,
    is_active, version_number, prompt_text, comment, created_by, created_at, updated_at
)
SELECT
    'review_response_generation',
    1,
    'Initial response generation v1',
    'You generate a draft customer response using template-guided constrained generation.
Rules:
- Follow the template structure and required elements.
- Do not promise compensation or legal guarantees.
- Do not invent facts.
- Keep a professional tone.
- Output plain text only (no JSON).',
    'Customer: {{customer_name}}
Review: {{review_text}}
Rating: {{rating}}
Classification: {{classification_json}}
Response template: {{template_text}}
Required elements: {{required_elements}}
Forbidden elements: {{forbidden_elements}}',
    TRUE,
    'gen-v1',
    'review_response_generation v1',
    'Milestone 4 seed',
    'system',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM prompt_versions WHERE prompt_key = 'review_response_generation'
);

ALTER TABLE review_responses ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS evaluation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    expected_quality_notes TEXT,
    operator_score INTEGER CHECK (operator_score IS NULL OR (operator_score >= 1 AND operator_score <= 5)),
    operator_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_cases_review_id ON evaluation_cases(review_id);
