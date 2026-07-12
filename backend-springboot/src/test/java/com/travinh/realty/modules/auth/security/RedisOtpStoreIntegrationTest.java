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
}
