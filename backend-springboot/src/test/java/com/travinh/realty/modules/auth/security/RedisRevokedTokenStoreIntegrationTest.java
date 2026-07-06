package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers(disabledWithoutDocker = true)
class RedisRevokedTokenStoreIntegrationTest {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    private StringRedisTemplate newTemplate() {
        LettuceConnectionFactory factory = new LettuceConnectionFactory(
                new RedisStandaloneConfiguration(REDIS.getHost(), REDIS.getMappedPort(6379)));
        factory.afterPropertiesSet();
        StringRedisTemplate template = new StringRedisTemplate(factory);
        template.afterPropertiesSet();
        return template;
    }

    @Test
    void tokenIsNotRevokedByDefault() {
        RevokedTokenStore store = new RedisRevokedTokenStore(newTemplate());

        assertThat(store.isRevoked("unknown-token-id")).isFalse();
    }

    @Test
    void revokedTokenIsReportedAsRevoked() {
        RevokedTokenStore store = new RedisRevokedTokenStore(newTemplate());

        store.revoke("token-a", Instant.now().plus(Duration.ofMinutes(5)));

        assertThat(store.isRevoked("token-a")).isTrue();
    }

    @Test
    void alreadyExpiredRevocationIsIgnored() {
        RevokedTokenStore store = new RedisRevokedTokenStore(newTemplate());

        store.revoke("token-b", Instant.now().minus(Duration.ofSeconds(1)));

        assertThat(store.isRevoked("token-b")).isFalse();
    }

    @Test
    void revocationIsVisibleAcrossSeparateInstancesSharingTheSameRedis() {
        // Simulates two backend nodes behind a load balancer: one revokes a token
        // on logout, the other must see it revoked on the very next request.
        RevokedTokenStore instanceA = new RedisRevokedTokenStore(newTemplate());
        RevokedTokenStore instanceB = new RedisRevokedTokenStore(newTemplate());

        instanceA.revoke("shared-token", Instant.now().plus(Duration.ofMinutes(5)));

        assertThat(instanceB.isRevoked("shared-token")).isTrue();
    }
}
