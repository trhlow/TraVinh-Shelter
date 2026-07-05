ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'CREATE_BROKER';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'LOCK_USER';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'UNLOCK_USER';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'UPDATE_PROPERTY_STATUS';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'HIDE_PROPERTY';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'UPDATE_VIEWING_STATUS';

ALTER TABLE audit_logs ADD COLUMN target_label VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN detail VARCHAR(500);

CREATE INDEX idx_users_role_status ON users (role, status);
CREATE INDEX idx_viewing_appointments_status_created ON viewing_appointments (status, created_at DESC);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs ("timestamp" DESC);
