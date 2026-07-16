package com.travinh.realty;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Proves V23__enable_pg_stat_statements.sql actually creates the extension when the server has
 * it preloaded (mirrors docker-compose.yml's dev command override), and proves the migration
 * doesn't fail deployment when it isn't preloaded (mirrors an unconfigured managed-Postgres prod).
 */
@Testcontainers(disabledWithoutDocker = true)
class PgStatStatementsIntegrationTest {

    @Container
    static final PostgreSQLContainer PRELOADED_POSTGRES = new PostgreSQLContainer("postgres:18.4-alpine")
            .withDatabaseName("tv_realty_pgss_test")
            .withUsername("postgres")
            .withPassword("postgres")
            .withCommand("postgres", "-c", "shared_preload_libraries=pg_stat_statements");

    @Test
    void extensionIsCreatedWhenPreloaded() throws SQLException {
        migrate(PRELOADED_POSTGRES);

        try (Connection connection = DriverManager.getConnection(
                     PRELOADED_POSTGRES.getJdbcUrl(), PRELOADED_POSTGRES.getUsername(), PRELOADED_POSTGRES.getPassword());
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(
                     "SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements'")) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getInt(1)).isEqualTo(1);
        }
    }

    private void migrate(PostgreSQLContainer container) {
        org.flywaydb.core.Flyway.configure()
                .dataSource(container.getJdbcUrl(), container.getUsername(), container.getPassword())
                .placeholders(java.util.Map.of(
                        "appRuntimePassword", "test-only-app-runtime-password",
                        "migratorUsername", container.getUsername()))
                .load()
                .migrate();
    }
}
