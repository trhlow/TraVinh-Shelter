package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Unlike RateLimiter/RevokedTokenStore, OTP correctness is security-critical: failing open on a
 * Redis outage would mean "treat any submitted code as correct." verify() must fail closed
 * (reject) and generate() must surface a 503 rather than silently issue an unstorable code.
 */
class RedisOtpStoreResilienceTest {

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
    void verifyFailsClosedWhenRedisIsUnreachable() {
        OtpStore store = new RedisOtpStore(unreachableTemplate());

        assertThat(store.verify("some-key", "123456")).isFalse();
    }

    @Test
    void generateThrows503WhenRedisIsUnreachable() {
        OtpStore store = new RedisOtpStore(unreachableTemplate());

        assertThatThrownBy(() -> store.generate("some-key", Duration.ofMinutes(10)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503");
    }
}
