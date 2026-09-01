-- 018: Audit journal (separate from operational telemetry).
--
-- operational_logs tracks the technical course of work (pipeline events,
-- latency, model) and human actions without an actor. audit_logs answers the
-- question "who did what": it records the console role from the Bearer token
-- (administrator / operator) for every mutation endpoint. Named users are out
-- of scope for now (demo project, role-token auth); user_id/user_name columns
-- are kept nullable for the future.

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_resource_type ON audit_logs (resource_type);
CREATE INDEX IF NOT EXISTS ix_audit_logs_resource_id ON audit_logs (resource_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_user_role ON audit_logs (user_role);