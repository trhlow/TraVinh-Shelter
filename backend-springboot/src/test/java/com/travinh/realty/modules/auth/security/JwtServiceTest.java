package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.user.model.User;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(new JwtProperties(
            "a-development-secret-that-is-at-least-thirty-two-characters-long", 86_400_000));

    @Test
    void generatesAndValidatesTokenForActiveUser() {
        User user = User.register("minh.nguyen", "minh@example.com", "hash", "Minh Nguyen", null);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        String token = jwtService.generateToken(user);

        assertThat(jwtService.extractEmail(token)).isEqualTo("minh@example.com");
        assertThat(jwtService.isTokenValid(token, UserPrincipal.from(user))).isTrue();
    }
}
