package com.travinh.realty.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.travinh.realty.modules.auth.dto.LoginRequest;
import com.travinh.realty.modules.auth.dto.LoginResponse;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Proves that a successful login of a legacy (un-prefixed BCrypt) password hash actually
 * persists the transparent Argon2 re-hash to the database, through a real transaction
 * boundary. Mocks cannot catch this class of bug: {@link AuthService#login} used to be
 * {@code @Transactional(readOnly = true)}, and {@link com.travinh.realty.modules.auth.security.JpaUserDetailsService#updatePassword}
 * had no transaction annotation of its own, so its {@code save()} joined the caller's
 * read-only transaction and was silently discarded (no flush) on commit.
 *
 * <p>Deliberately NOT annotated {@code @Transactional} — running this test inside a
 * Spring-managed test transaction would mask the exact commit-visibility bug being proven
 * fixed. Each test method uses its own unique email/username (matching the pattern used by
 * {@code MediaConcurrencyIntegrationTest}) so the shared Testcontainers Postgres instance
 * does not need explicit row cleanup between runs.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes",
        "spring.autoconfigure.exclude=org.springframework.boot.data.redis.autoconfigure.DataRedisAutoConfiguration"
})
@Testcontainers(disabledWithoutDocker = true)
class AuthServiceRehashIntegrationTest {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18.4-alpine")
            .withDatabaseName("tv_realty_auth_rehash_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    private static final String PLAINTEXT_PASSWORD = "LegacyBcrypt#2026";

    @Autowired private AuthService authService;
    @Autowired private UserRepository users;

    @Test
    void loginOfLegacyBcryptHashPersistsArgon2RehashAcrossItsOwnTransaction() {
        String token = "zzrehash." + UUID.randomUUID();
        String email = token + "@example.com";
        String legacyBcryptHash = new BCryptPasswordEncoder().encode(PLAINTEXT_PASSWORD);
        User user = User.register(token, email, legacyBcryptHash, "Legacy Rehash User", "0900000000");
        users.saveAndFlush(user);
        assertThat(user.getRole()).isEqualTo(UserRole.BROKER);

        LoginResponse response = authService.login(new LoginRequest(email, PLAINTEXT_PASSWORD));

        assertThat(response.email()).isEqualTo(email);

        User persisted = users.findByEmail(email).orElseThrow();
        assertThat(persisted.getPasswordHash())
                .as("password hash must be durably re-hashed to Argon2id after the login transaction commits")
                .startsWith("{argon2}");
    }
}
