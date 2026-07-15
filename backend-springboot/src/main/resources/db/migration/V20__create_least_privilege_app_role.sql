-- Splits the JPA/Hikari runtime user from the Flyway migrator user: the app connects with a
-- restricted role that can only do CRUD (SELECT/INSERT/UPDATE/DELETE), not DDL. If the app
-- process is ever compromised (unpatched SQLi, RCE...), the attacker cannot DROP/ALTER schema.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'travinh_app_runtime') THEN
    CREATE ROLE travinh_app_runtime LOGIN PASSWORD '${appRuntimePassword}';
  ELSE
    ALTER ROLE travinh_app_runtime WITH LOGIN PASSWORD '${appRuntimePassword}';
  END IF;
END $$;

-- current_database() instead of a hard-coded 'travinh_realty' so this migration also works
-- against the differently-named databases each Testcontainers integration test spins up.
DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO travinh_app_runtime', current_database());
END $$;

GRANT USAGE ON SCHEMA public TO travinh_app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO travinh_app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO travinh_app_runtime;

-- Narrow the blanket grant above for the migration ledger and the audit trail: a compromised
-- runtime connection must not be able to rewrite Flyway's history or tamper with existing audit
-- rows. SELECT stays on both (read access is harmless, e.g. actuator/flyway info endpoints), and
-- INSERT stays on audit_logs (normal app logging still needs to write new audit rows) — only
-- UPDATE/DELETE are revoked, since those are the operations that would let an attacker cover
-- their tracks.
REVOKE UPDATE, DELETE ON flyway_schema_history, audit_logs FROM travinh_app_runtime;

-- NOTE: the ALTER DEFAULT PRIVILEGES below applies the same blanket SELECT/INSERT/UPDATE/DELETE
-- grant to tables created by *future* migrations. If a future migration introduces another
-- audit/history-style table (append-only, must not be mutated by the runtime role), that
-- migration must explicitly run its own
-- `REVOKE UPDATE, DELETE ON <new_table> FROM travinh_app_runtime;` — there is no generic
-- mechanism here for a table that doesn't exist yet.
ALTER DEFAULT PRIVILEGES FOR ROLE ${migratorUsername} IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO travinh_app_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE ${migratorUsername} IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO travinh_app_runtime;
