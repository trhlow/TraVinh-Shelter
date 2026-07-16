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
 * Proves V22__revoke_public_schema_privileges.sql: the PUBLIC pseudo-role has no default
 * privilege left on the public schema after migration, matching CIS PostgreSQL Benchmark's
 * "no implicit PUBLIC access" recommendation.
 */
@SpringBootTest(properties = "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes")
@Testcontainers(disabledWithoutDocker = true)
class PublicSchemaPrivilegeIntegrationTest {

    private static final String APP_RUNTIME_PASSWORD = "test-only-app-runtime-password";

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18.4-alpine")
            .withDatabaseName("tv_realty_public_priv_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.placeholders.appRuntimePassword", () -> APP_RUNTIME_PASSWORD);
        registry.add("spring.flyway.placeholders.migratorUsername", POSTGRES::getUsername);
    }

    @Test
    void publicPseudoRoleHasNoDefaultSchemaPrivilege() throws SQLException {
        try (Connection connection = DriverManager.getConnection(
                     POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(
                     "SELECT has_schema_privilege('public', 'public', 'USAGE')")) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getBoolean(1)).isFalse();
        }
    }

    @Test
    void appRuntimeRoleStillHasUsageDespitePublicRevoke() throws SQLException {
        try (Connection connection = DriverManager.getConnection(
                     POSTGRES.getJdbcUrl(), "travinh_app_runtime", APP_RUNTIME_PASSWORD);
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("SELECT count(*) FROM categories")) {
            assertThat(resultSet.next()).isTrue();
        }
    }
}
