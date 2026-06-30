package com.travinh.realty.modules.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository users;
    @Mock private AuthenticationManager authenticationManager;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final JwtProperties properties = new JwtProperties(
            "a-development-secret-that-is-at-least-thirty-two-characters-long", 86_400_000);
    private final JwtService jwt = new JwtService(properties);

    @Test
    void loginPropagatesInvalidCredentialsForTheHttpErrorHandler() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties);

        assertThatThrownBy(() -> service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                "minh@example.com", "wrong-password")))
                .isInstanceOf(BadCredentialsException.class);
    }
}
