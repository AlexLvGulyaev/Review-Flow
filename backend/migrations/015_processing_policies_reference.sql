-- Sprint 025B: processing_policies NSI + FK on response_cases

CREATE TABLE IF NOT EXISTS processing_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name_ru VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO processing_policies (code, name_ru, description)
VALUES
    (
        'operator_review_with_llm_draft',
        'Операторская проверка с LLM-черновиком',
        'LLM формирует черновик ответа, оператор проверяет и отправляет финальный ответ.'
    ),
    (
        'operator_required',
        'Требуется оператор',
        'Legacy: оператор обязателен для финального ответа (до нормализации НСИ).'
    ),
    (
        'auto_draft_if_confident',
        'Авточерновик при уверенности',
        'Legacy: черновик формируется автоматически при достаточной уверенности (до нормализации НСИ).'
    )
ON CONFLICT (code) DO NOTHING;

ALTER TABLE response_cases
    ADD COLUMN IF NOT EXISTS processing_policy_id UUID REFERENCES processing_policies (id);

UPDATE response_cases rc
SET processing_policy_id = pp.id
FROM processing_policies pp
WHERE rc.processing_policy_id IS NULL
  AND pp.code = CASE rc.review_policy
      WHEN 'auto_draft_if_confident' THEN 'auto_draft_if_confident'
      WHEN 'operator_required' THEN 'operator_review_with_llm_draft'
      ELSE 'operator_review_with_llm_draft'
  END;

UPDATE response_cases rc
SET processing_policy_id = (
    SELECT id FROM processing_policies WHERE code = 'operator_review_with_llm_draft' LIMIT 1
)
WHERE rc.processing_policy_id IS NULL;

ALTER TABLE response_cases
    ALTER COLUMN processing_policy_id SET NOT NULL;

UPDATE response_cases rc
SET review_policy = pp.code
FROM processing_policies pp
WHERE pp.id = rc.processing_policy_id;

CREATE INDEX IF NOT EXISTS idx_response_cases_processing_policy_id
    ON response_cases (processing_policy_id);

-- Legacy column review_policy retained: denormalized code for CH presenter compatibility.
