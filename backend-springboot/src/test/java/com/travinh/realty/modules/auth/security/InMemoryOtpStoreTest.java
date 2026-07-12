package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class InMemoryOtpStoreTest {

    @Test
    void generateReturnsASixDigitNumericCode() {
        OtpStore store = new InMemoryOtpStore();

        String code = store.generate("key-a", Duration.ofMinutes(10));

        assertThat(code).matches("\\d{6}");
    }

    @Test
    void verifyWithCorrectCodeSucceedsAndConsumesTheEntry() {
        OtpStore store = new InMemoryOtpStore();
        String code = store.generate("key-b", Duration.ofMinutes(10));

        assertThat(store.verify("key-b", code)).isTrue();
        // single-use: the same correct code cannot be verified twice
        assertThat(store.verify("key-b", code)).isFalse();
    }

    @Test
    void verifyWithWrongCodeFailsButDoesNotConsumeTheEntry() {
        OtpStore store = new InMemoryOtpStore();
        String code = store.generate("key-c", Duration.ofMinutes(10));

        assertThat(store.verify("key-c", "000000".equals(code) ? "111111" : "000000")).isFalse();
        // the correct code must still work after a wrong guess (retry allowed within TTL)
        assertThat(store.verify("key-c", code)).isTrue();
    }

    @Test
    void verifyOnUnknownKeyReturnsFalse() {
        OtpStore store = new InMemoryOtpStore();

        assertThat(store.verify("never-generated", "123456")).isFalse();
    }

    @Test
    void verifyAfterExpiryReturnsFalse() throws InterruptedException {
        OtpStore store = new InMemoryOtpStore();
        String code = store.generate("key-d", Duration.ofMillis(20));

        Thread.sleep(60);

        assertThat(store.verify("key-d", code)).isFalse();
    }
}
