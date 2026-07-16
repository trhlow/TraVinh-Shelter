package com.travinh.realty;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Proves V24__drop_user_role_enum_value.sql: the self-registered "USER" actor was removed from
 * the product (Pass 3) and no code path can create a role=USER row anymore, so the Postgres
 * user_role enum type should only expose BROKER/ADMIN, with no leftover implicit DEFAULT.
 */
@SpringBootTest(properties = "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes")
@Testcontainers(disabledWithoutDocker = true)
class UserRoleEnumIntegrationTest {

    private static final String APP_RUNTIME_PASSWORD = "test-only-app-runtime-password";

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18.4-alpine")
            .withDatabaseName("tv_realty_user_role_enum_test")
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
    void userRoleEnumOnlyExposesBrokerAndAdmin() throws SQLException {
        try (Connection connection = DriverManager.getConnection(
                     POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(
                     "SELECT unnest(enum_range(NULL::user_role))::text AS value ORDER BY value")) {
            List<String> values = new ArrayList<>();
            while (resultSet.next()) {
                values.add(resultSet.getString("value"));
            }
            assertThat(values).containsExactly("ADMIN", "BROKER");
        }
    }

    @Test
    void usersRoleColumnHasNoDefault() throws SQLException {
        try (Connection connection = DriverManager.getConnection(
                     POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(
                     "SELECT column_default FROM information_schema.columns "
                             + "WHERE table_name = 'users' AND column_name = 'role'")) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getString("column_default")).isNull();
        }
    }

    @Test
    void appRuntimeRoleCanStillReadAndWriteUsersAfterEnumTypeSwap() throws SQLException {
        try (Connection connection = DriverManager.getConnection(
                     POSTGRES.getJdbcUrl(), "travinh_app_runtime", APP_RUNTIME_PASSWORD);
             Statement statement = connection.createStatement()) {
            try (ResultSet resultSet = statement.executeQuery("SELECT count(*) FROM users")) {
                assertThat(resultSet.next()).isTrue();
            }
            statement.executeUpdate("""
                    INSERT INTO users (id, username, password_hash, full_name, phone, email, role, status, password_changed_at)
                    VALUES (gen_random_uuid(), 'enum-swap-test', 'x', 'Enum Swap Test', '0900000099',
                            'enum-swap-test@example.com', 'BROKER', 'ACTIVE', now())
                    """);
            statement.executeUpdate("DELETE FROM users WHERE username = 'enum-swap-test'");
        }
    }
}
