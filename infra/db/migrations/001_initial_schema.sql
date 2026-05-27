-- Review Flow — initial schema (Milestone 1)
-- Source: SOT v4 + customers alignment

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Reference / knowledge base tables (no FK deps)

CREATE TABLE interaction_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_code VARCHAR(64) NOT NULL UNIQUE,
    scenario_name VARCHAR(255) NOT NULL,
    description TEXT,
    required_response_elements TEXT,
    forbidden_response_elements TEXT,
    escalation_rules TEXT
);

CREATE TABLE sentiment_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sentiment_code VARCHAR(64) NOT NULL UNIQUE,
    sentiment_name VARCHAR(255) NOT NULL,
    tone_policy TEXT,
    forbidden_tone TEXT,
    escalation_hint TEXT
);

CREATE TABLE review_phrase_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phrase_text TEXT NOT NULL,
    scenario VARCHAR(64),
    sentiment VARCHAR(64),
    topic VARCHAR(128),
    product_area VARCHAR(128),
    priority_hint VARCHAR(32),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE response_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario VARCHAR(64),
    sentiment VARCHAR(64),
    priority VARCHAR(32),
    rating_min SMALLINT,
    rating_max SMALLINT,
    topic VARCHAR(128),
    product_area VARCHAR(128),
    template_text TEXT NOT NULL,
    required_elements TEXT,
    forbidden_elements TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_number VARCHAR(32) NOT NULL,
    prompt_text TEXT NOT NULL,
    comment TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(128)
);

-- Core entities

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_external_id VARCHAR(128),
    customer_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(64),
    customer_segment VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE service_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    case_type VARCHAR(64),
    case_title VARCHAR(255),
    product_area VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_service_cases_customer_id ON service_cases(customer_id);

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_case_id UUID REFERENCES service_cases(id) ON DELETE SET NULL,
    review_text TEXT NOT NULL,
    rating SMALLINT,
    product_area VARCHAR(128),
    source_channel VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_reviews_service_case_id ON reviews(service_case_id);

-- Pipeline results

CREATE TABLE review_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    matched_phrase_id UUID REFERENCES review_phrase_patterns(id) ON DELETE SET NULL,
    phrase_match_score NUMERIC(5, 4),
    classification_source VARCHAR(32),
    scenario VARCHAR(64),
    sentiment VARCHAR(64),
    priority VARCHAR(32),
    topic VARCHAR(128),
    product_area VARCHAR(128),
    rating SMALLINT,
    confidence NUMERIC(5, 4),
    needs_phrase_review BOOLEAN DEFAULT FALSE,
    suggested_new_phrase TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_classifications_review_id ON review_classifications(review_id);

CREATE TABLE review_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    classification_id UUID REFERENCES review_classifications(id) ON DELETE SET NULL,
    template_id UUID REFERENCES response_templates(id) ON DELETE SET NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    draft_response TEXT,
    final_response TEXT,
    moderation_status VARCHAR(32) DEFAULT 'pending_review',
    publication_status VARCHAR(32) DEFAULT 'not_published',
    operator_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_responses_review_id ON review_responses(review_id);

-- Evaluation

CREATE TABLE evaluation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_version_id UUID NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
    run_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(128)
);

CREATE TABLE evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_run_id UUID NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
    review_text TEXT NOT NULL,
    rating SMALLINT,
    expected_scenario VARCHAR(64),
    predicted_scenario VARCHAR(64),
    expected_sentiment VARCHAR(64),
    predicted_sentiment VARCHAR(64),
    expected_priority VARCHAR(32),
    predicted_priority VARCHAR(32),
    expected_topic VARCHAR(128),
    predicted_topic VARCHAR(128),
    expected_product_area VARCHAR(128),
    predicted_product_area VARCHAR(128),
    is_match BOOLEAN,
    error_notes TEXT
);

CREATE INDEX idx_evaluation_results_run_id ON evaluation_results(evaluation_run_id);

-- Analytics & observability

CREATE TABLE review_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE,
    period_end DATE,
    topic VARCHAR(128),
    product_area VARCHAR(128),
    sentiment VARCHAR(64),
    rating_avg NUMERIC(4, 2),
    review_count INTEGER DEFAULT 0,
    repeated_issue_count INTEGER DEFAULT 0
);

CREATE TABLE operational_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64),
    entity_id UUID,
    prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    model_name VARCHAR(128),
    latency_ms INTEGER,
    status VARCHAR(32),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_operational_logs_created_at ON operational_logs(created_at DESC);
