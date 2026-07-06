package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * A Redis outage must not turn login/viewing-submission into a global outage: rate limiting
 * is defense-in-depth, so it must fail open (allow the request through, with logging) rather
 * than throw and 500 every request.
 */
class RedisRateLimiterResilienceTest {

    private StringRedisTemplate unreachableTemplate() {
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
    void tryAcquireFailsOpenWhenRedisIsUnreachable() {
        RateLimiter limiter = new RedisRateLimiter(unreachableTemplate());

        assertThatCode(() -> assertThat(limiter.tryAcquire("key", 10, Duration.ofMinutes(1))).isTrue())
                .doesNotThrowAnyException();
    }
}
