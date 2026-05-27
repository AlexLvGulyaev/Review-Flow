CREATE TABLE IF NOT EXISTS ai_provider_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_key VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    model_name VARCHAR(128) NOT NULL,
    base_url_env_key VARCHAR(128),
    api_key_env_key VARCHAR(128),
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
    temperature NUMERIC(4, 2),
    max_tokens INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ai_provider_settings (
    provider_key, display_name, model_name, base_url_env_key, api_key_env_key,
    is_enabled, is_active, is_fallback, temperature, max_tokens
) VALUES
    ('mock', 'Mock provider', 'mock-local', NULL, NULL, TRUE, TRUE, TRUE, 0.10, 1024),
    ('openai', 'OpenAI', 'gpt-4o-mini', 'OPENAI_BASE_URL', 'OPENAI_API_KEY', FALSE, FALSE, FALSE, 0.10, 2048),
    ('proxyapi', 'ProxyAPI OpenAI-compatible', 'gpt-4o-mini', 'PROXYAPI_BASE_URL', 'PROXYAPI_KEY', FALSE, FALSE, FALSE, 0.10, 2048),
    ('gigachat', 'GigaChat', 'GigaChat-Max', NULL, 'GIGACHAT_AUTH_KEY', FALSE, FALSE, FALSE, 0.20, 500)
ON CONFLICT (provider_key) DO NOTHING;
