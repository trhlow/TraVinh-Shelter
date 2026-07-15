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
ALTER DEFAULT PRIVILEGES FOR ROLE ${migratorUsername} IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO travinh_app_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE ${migratorUsername} IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO travinh_app_runtime;
