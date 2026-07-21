-- CIS PostgreSQL Benchmark / production monitoring baseline: pg_stat_statements tracks execution
-- statistics for slow-query monitoring. It requires shared_preload_libraries=pg_stat_statements at
-- the server level (set via docker-compose.yml's `command:` for local/dev Postgres); a managed
-- provider (e.g. DigitalOcean) may or may not preload it depending on plan/config, so this is
-- wrapped to skip safely instead of failing the whole migration (and blocking deploy) when the
-- extension isn't preloaded there — confirm manually via the provider's dashboard/CLI before
-- relying on this for production monitoring (see docs/DEPLOYMENT.md).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_stat_statements unavailable (likely missing from shared_preload_libraries) - skipped safely.';
END $$;
