package com.travinh.realty;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.postgresql.util.PSQLException;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Proves the least-privilege split introduced by V20__create_least_privilege_app_role.sql:
 * the runtime role {@code travinh_app_runtime} can do ordinary CRUD (SELECT/INSERT/UPDATE/DELETE)
 * but has no DDL rights (e.g. ALTER TABLE), so a compromised app process cannot alter the schema.
 */
@SpringBootTest(properties = "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes")
@Testcontainers(disabledWithoutDocker = true)
class AppRuntimeRoleIntegrationTest {

    private static final String APP_RUNTIME_PASSWORD = "test-only-app-runtime-password";

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18.4-alpine")
            .withDatabaseName("tv_realty_role_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        // Flyway migrates as the Testcontainers bootstrap superuser (spring.datasource.* falls
        // back to it since spring.flyway.url/user/password aren't overridden here) — it needs
        // CREATE ROLE / GRANT privileges to run V20.
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.placeholders.appRuntimePassword", () -> APP_RUNTIME_PASSWORD);
        registry.add("spring.flyway.placeholders.migratorUsername", POSTGRES::getUsername);
    }

    private Connection appRuntimeConnection;

    @AfterEach
    void closeConnection() throws SQLException {
        if (appRuntimeConnection != null && !appRuntimeConnection.isClosed()) {
            appRuntimeConnection.close();
        }
    }

    @Test
    void appRuntimeRoleCanDoCrudButCannotAlterSchema() throws SQLException {
        appRuntimeConnection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), "travinh_app_runtime", APP_RUNTIME_PASSWORD);

        try (Statement statement = appRuntimeConnection.createStatement()) {
            try (ResultSet resultSet = statement.executeQuery(
                    "SELECT count(*) FROM categories")) {
                assertThat(resultSet.next()).isTrue();
                assertThat(resultSet.getInt(1)).isGreaterThan(0);
            }

            statement.executeUpdate("""
                    INSERT INTO categories (name, slug, description)
                    VALUES ('Role Test', 'role-test-slug', 'temp')
                    """);
            statement.executeUpdate(
                    "UPDATE categories SET description = 'updated' WHERE slug = 'role-test-slug'");
            statement.executeUpdate("DELETE FROM categories WHERE slug = 'role-test-slug'");
        }

        assertThatThrownBy(() -> {
            try (Statement statement = appRuntimeConnection.createStatement()) {
                statement.execute("ALTER TABLE categories ADD COLUMN role_test_column TEXT");
            }
        }).isInstanceOf(PSQLException.class)
          // Postgres rejects ALTER TABLE for a non-owner with "must be owner of table" rather
          // than the generic "permission denied" used for missing SELECT/INSERT/etc. grants —
          // either way, travinh_app_runtime never became the table owner, so no DDL is possible.
          .hasMessageContaining("must be owner of table");
    }
}
