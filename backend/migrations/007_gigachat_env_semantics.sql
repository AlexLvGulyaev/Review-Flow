UPDATE ai_provider_settings
SET
    model_name = 'GigaChat-Max',
    api_key_env_key = 'GIGACHAT_AUTH_KEY',
    base_url_env_key = NULL,
    max_tokens = 500,
    updated_at = NOW()
WHERE provider_key = 'gigachat';
