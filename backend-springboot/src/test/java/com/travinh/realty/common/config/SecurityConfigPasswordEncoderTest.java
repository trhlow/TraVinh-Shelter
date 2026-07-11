package com.travinh.realty.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class SecurityConfigPasswordEncoderTest {

    private final PasswordEncoder encoder = new SecurityConfig().passwordEncoder();

    @Test
    void encodesNewPasswordsWithArgon2Prefix() {
        String encoded = encoder.encode("correct horse battery staple");

        assertThat(encoded).startsWith("{argon2}");
    }

    @Test
    void stillVerifiesLegacyBcryptHashesWithoutAPrefix() {
        String legacyHash = new BCryptPasswordEncoder().encode("correct horse battery staple");

        assertThat(encoder.matches("correct horse battery staple", legacyHash)).isTrue();
        assertThat(encoder.matches("wrong password", legacyHash)).isFalse();
    }
}
