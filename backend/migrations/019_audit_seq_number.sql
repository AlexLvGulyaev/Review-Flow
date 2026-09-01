-- 019: Human-readable numeric id for audit entries (parity with the AIC
-- reference, where the audit entry id is a small number). The UUID primary
-- key stays (it is the API routing key); seq_number is a monotonic display
-- number shown in the UI (#N) and CSV instead of the raw UUID.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS seq_number BIGINT;

CREATE SEQUENCE IF NOT EXISTS audit_logs_seq_number_seq
    OWNED BY audit_logs.seq_number;

UPDATE audit_logs SET seq_number = nextval('audit_logs_seq_number_seq')
WHERE seq_number IS NULL;

ALTER TABLE audit_logs
    ALTER COLUMN seq_number SET DEFAULT nextval('audit_logs_seq_number_seq'),
    ALTER COLUMN seq_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_logs_seq_number
    ON audit_logs (seq_number);