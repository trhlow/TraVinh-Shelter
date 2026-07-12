CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_users_username_trgm ON users USING gin (lower(username) gin_trgm_ops);
CREATE INDEX idx_users_email_trgm ON users USING gin (lower(email) gin_trgm_ops);
CREATE INDEX idx_users_full_name_trgm ON users USING gin (lower(full_name) gin_trgm_ops);

CREATE INDEX idx_viewing_appointments_visitor_name_trgm
    ON viewing_appointments USING gin (lower(visitor_name) gin_trgm_ops);
CREATE INDEX idx_viewing_appointments_visitor_phone_trgm
    ON viewing_appointments USING gin (lower(visitor_phone) gin_trgm_ops);
