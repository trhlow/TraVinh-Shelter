-- Adding an enum value must be the only statement referencing it in this migration:
-- Postgres forbids using a newly-added enum value within the same transaction that added it
-- (see V15 for the same pattern applied to audit_action).
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'DELETED';
