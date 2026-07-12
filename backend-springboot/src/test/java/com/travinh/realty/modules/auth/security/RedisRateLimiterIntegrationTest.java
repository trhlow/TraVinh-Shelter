package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers(disabledWithoutDocker = true)
class RedisRateLimiterIntegrationTest {

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
    void allowsRequestsWithinLimit() {
        RateLimiter limiter = new RedisRateLimiter(newTemplate());
        String key = "within-limit:" + System.nanoTime();

        for (int i = 0; i < 5; i++) {
            assertThat(limiter.tryAcquire(key, 5, Duration.ofMinutes(1))).isTrue();
        }
    }

    @Test
    void blocksRequestsOverLimit() {
        RateLimiter limiter = new RedisRateLimiter(newTemplate());
        String key = "over-limit:" + System.nanoTime();

        for (int i = 0; i < 5; i++) {
            limiter.tryAcquire(key, 5, Duration.ofMinutes(1));
        }

        assertThat(limiter.tryAcquire(key, 5, Duration.ofMinutes(1))).isFalse();
    }

    @Test
    void limitIsSharedAcrossSeparateInstancesSharingTheSameRedis() {
        // Simulates two backend nodes behind a load balancer: attempts against either
        // node must count toward the same shared limit.
        RateLimiter nodeA = new RedisRateLimiter(newTemplate());
        RateLimiter nodeB = new RedisRateLimiter(newTemplate());
        String key = "shared:" + System.nanoTime();

        for (int i = 0; i < 3; i++) {
            assertThat(nodeA.tryAcquire(key, 5, Duration.ofMinutes(1))).isTrue();
        }
        for (int i = 0; i < 2; i++) {
            assertThat(nodeB.tryAcquire(key, 5, Duration.ofMinutes(1))).isTrue();
        }

        assertThat(nodeA.tryAcquire(key, 5, Duration.ofMinutes(1))).isFalse();
    }

    @Test
    void firstAcquireAtomicallySetsATtlSoTheKeyCannotBeLeftWithoutExpiry() {
        // INCR and EXPIRE must happen as one atomic operation on the first hit of a window.
        // If they were two separate calls, a crash in between would leave the key with no
        // TTL — permanently rate-limiting that key for this group.
        StringRedisTemplate template = newTemplate();
        RateLimiter limiter = new RedisRateLimiter(template);
        String key = "ttl-check:" + System.nanoTime();

        limiter.tryAcquire(key, 5, Duration.ofMinutes(1));

        Long ttl = template.getExpire("rate-limit:" + key);
        assertThat(ttl).isNotNull().isGreaterThan(0);
    }
}
