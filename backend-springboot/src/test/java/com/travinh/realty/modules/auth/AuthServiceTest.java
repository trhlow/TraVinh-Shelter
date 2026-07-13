package com.travinh.realty.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.security.InMemoryRateLimiter;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

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
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties, new InMemoryRateLimiter());

        assertThatThrownBy(() -> service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                "minh@example.com", "wrong-password")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginIsRateLimitedPerAccountAfterFiveFailuresRegardlessOfCaller() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));
        RateLimiter rateLimiter = new InMemoryRateLimiter();
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties, rateLimiter);
        com.travinh.realty.modules.auth.dto.LoginRequest request =
                new com.travinh.realty.modules.auth.dto.LoginRequest("locked-out@example.com", "wrong-password");

        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> service.login(request)).isInstanceOf(BadCredentialsException.class);
        }

        assertThatThrownBy(() -> service.login(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }

    @Test
    void loginDoesNotCountSuccessfulAttemptsTowardTheAccountRateLimit() {
        User user = User.register("minh.nguyen", "minh@example.com", encoder.encode("correct-password"),
                "Minh Nguyen", null);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        when(users.findByEmail("minh@example.com")).thenReturn(Optional.of(user));
        UserPrincipal principal = UserPrincipal.from(user);
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                new InMemoryRateLimiter());
        com.travinh.realty.modules.auth.dto.LoginRequest request =
                new com.travinh.realty.modules.auth.dto.LoginRequest("minh@example.com", "correct-password");

        for (int attempt = 0; attempt < 10; attempt++) {
            assertThat(service.login(request).email()).isEqualTo("minh@example.com");
        }
    }
}
