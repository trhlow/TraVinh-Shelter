package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers(disabledWithoutDocker = true)
class RedisOtpStoreIntegrationTest {

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
    void generateReturnsASixDigitCode() {
        OtpStore store = new RedisOtpStore(newTemplate());

        String code = store.generate("key:" + System.nanoTime(), Duration.ofMinutes(10));

        assertThat(code).matches("\\d{6}");
    }

    @Test
    void verifyWithCorrectCodeSucceedsAndConsumesTheEntry() {
        OtpStore store = new RedisOtpStore(newTemplate());
        String key = "key:" + System.nanoTime();
        String code = store.generate(key, Duration.ofMinutes(10));

        assertThat(store.verify(key, code)).isTrue();
        assertThat(store.verify(key, code)).isFalse();
    }

    @Test
    void verifyWithWrongCodeFailsButDoesNotConsumeTheEntry() {
        OtpStore store = new RedisOtpStore(newTemplate());
        String key = "key:" + System.nanoTime();
        String code = store.generate(key, Duration.ofMinutes(10));
        String wrongCode = "000000".equals(code) ? "111111" : "000000";

        assertThat(store.verify(key, wrongCode)).isFalse();
        assertThat(store.verify(key, code)).isTrue();
    }

    @Test
    void verifyOnUnknownKeyReturnsFalse() {
        OtpStore store = new RedisOtpStore(newTemplate());

        assertThat(store.verify("never-generated:" + System.nanoTime(), "123456")).isFalse();
    }

    @Test
    void otpIsVisibleAcrossSeparateInstancesSharingTheSameRedis() {
        OtpStore instanceA = new RedisOtpStore(newTemplate());
        OtpStore instanceB = new RedisOtpStore(newTemplate());
        String key = "shared:" + System.nanoTime();

        String code = instanceA.generate(key, Duration.ofMinutes(10));

        assertThat(instanceB.verify(key, code)).isTrue();
    }

    /**
     * Regression test for a check-then-delete race: two concurrent verify() calls submitting
     * the same correct code must not both succeed. Mirrors the ExecutorService/CountDownLatch
     * gated-start pattern used in MediaConcurrencyIntegrationTest to tighten the race window.
     */
    @Test
    void verifyIsAtomicSoOnlyOneConcurrentCallerWithTheCorrectCodeSucceeds() throws Exception {
        OtpStore store = new RedisOtpStore(newTemplate());
        String key = "race:" + System.nanoTime();
        String code = store.generate(key, Duration.ofMinutes(10));

        int attempts = 8;
        ExecutorService executor = Executors.newFixedThreadPool(attempts);
        CountDownLatch ready = new CountDownLatch(attempts);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Callable<Boolean>> tasks = IntStream.range(0, attempts)
                    .<Callable<Boolean>>mapToObj(attempt -> () -> {
                        ready.countDown();
                        start.await(5, TimeUnit.SECONDS);
                        return store.verify(key, code);
                    })
                    .toList();
            List<Future<Boolean>> futures = tasks.stream().map(executor::submit).toList();
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<Boolean> outcomes = futures.stream().map(future -> {
                try {
                    return future.get(20, TimeUnit.SECONDS);
                } catch (Exception exception) {
                    throw new IllegalStateException(exception);
                }
            }).toList();

            assertThat(outcomes).filteredOn(Boolean::booleanValue).hasSize(1);
        } finally {
            executor.shutdownNow();
        }
    }
}
