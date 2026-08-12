-- Tokenized demo sessions for the public Web UI + demo_mode flag on reviews.
-- Applies the APL pattern `web-ui-tokenized-demo-limiter`.

CREATE TABLE IF NOT EXISTS demo_sessions (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    session_id VARCHAR(255),
    client_ip VARCHAR(45),
    requests_used INTEGER NOT NULL DEFAULT 0,
    requests_limit INTEGER NOT NULL DEFAULT 20,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_request_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_demo_sessions_token ON demo_sessions (token);
CREATE INDEX IF NOT EXISTS ix_demo_sessions_session_id ON demo_sessions (session_id);
CREATE INDEX IF NOT EXISTS ix_demo_sessions_client_ip ON demo_sessions (client_ip);

-- Mark reviews created through a demo session so analytics and the operator
-- queue can distinguish them from real production traffic (backward compatible:
-- existing rows default to FALSE).
ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS demo_mode BOOLEAN NOT NULL DEFAULT FALSE;