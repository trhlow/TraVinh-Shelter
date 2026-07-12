package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * A Redis outage must not turn into an outage of the entire authenticated surface: revocation
 * checks and rate limiting are defense-in-depth on top of JWT signature verification, not the
 * only line of defense, so they must fail open (with logging) rather than throw.
 */
class RedisRevokedTokenStoreResilienceTest {

    private StringRedisTemplate unreachableTemplate() {
        // Port 1 is reserved/unlikely to be listening; connection attempts fail fast.
        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
                .commandTimeout(Duration.ofMillis(200))
                .build();
        LettuceConnectionFactory factory = new LettuceConnectionFactory(
                new RedisStandaloneConfiguration("127.0.0.1", 1), clientConfig);
        factory.afterPropertiesSet();
        StringRedisTemplate template = new StringRedisTemplate(factory);
        template.afterPropertiesSet();
        return template;
    }

    @Test
    void isRevokedFailsOpenWhenRedisIsUnreachable() {
        RevokedTokenStore store = new RedisRevokedTokenStore(unreachableTemplate());

        assertThatCode(() -> assertThat(store.isRevoked("some-token")).isFalse())
                .doesNotThrowAnyException();
    }

    @Test
    void revokeDoesNotThrowWhenRedisIsUnreachable() {
        RevokedTokenStore store = new RedisRevokedTokenStore(unreachableTemplate());

        assertThatCode(() -> store.revoke("some-token", Instant.now().plusSeconds(60)))
                .doesNotThrowAnyException();
    }
}
