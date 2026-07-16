-- CIS PostgreSQL 18 Benchmark: the PUBLIC pseudo-role should not retain any default privilege on
-- the public schema. Every real access path already has its own explicit grant — the Flyway
-- migrator owns the schema, and travinh_app_runtime was explicitly granted USAGE + CRUD in V20 —
-- so this only removes the *implicit* privilege PostgreSQL grants to PUBLIC by default; it does
-- not change what the app or the migrator can do.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
