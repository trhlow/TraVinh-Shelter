package com.travinh.realty.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.dto.LoginResponse;
import com.travinh.realty.modules.auth.security.InMemoryRateLimiter;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
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
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                new InMemoryRateLimiter(), Mockito.mock(LoginMfaService.class));

        assertThatThrownBy(() -> service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                "minh@example.com", "wrong-password")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginIsRateLimitedPerAccountAfterFiveFailuresRegardlessOfCaller() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));
        RateLimiter rateLimiter = new InMemoryRateLimiter();
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                rateLimiter, Mockito.mock(LoginMfaService.class));
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
                new InMemoryRateLimiter(), Mockito.mock(LoginMfaService.class));
        com.travinh.realty.modules.auth.dto.LoginRequest request =
                new com.travinh.realty.modules.auth.dto.LoginRequest("minh@example.com", "correct-password");

        for (int attempt = 0; attempt < 10; attempt++) {
            assertThat(service.login(request).email()).isEqualTo("minh@example.com");
        }
    }

    @Test
    void loginFailureIsLoggedAsSecurityEvent() {
        Logger logger = (Logger) LoggerFactory.getLogger(AuthService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));
            AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                    new InMemoryRateLimiter(), Mockito.mock(LoginMfaService.class));

            assertThatThrownBy(() -> service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                    "audit-test@example.com", "wrong-password")))
                    .isInstanceOf(BadCredentialsException.class);

            assertThat(appender.list)
                    .anyMatch(event -> event.getLevel() == Level.WARN
                            && event.getFormattedMessage().contains("audit-test@example.com"));
        } finally {
            logger.detachAppender(appender);
        }
    }

    @Test
    void adminLoginReturnsMfaChallengeWithoutIssuingJwt() {
        User admin = User.register("admin", "admin@example.com", encoder.encode("correct-password"),
                "Admin", "0900000000");
        ReflectionTestUtils.setField(admin, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        UserPrincipal principal = UserPrincipal.from(admin);
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        LoginMfaService mfaService = Mockito.mock(LoginMfaService.class);
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                new InMemoryRateLimiter(), mfaService);

        LoginResponse response = service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                "admin@example.com", "correct-password"));

        assertThat(response.mfaRequired()).isTrue();
        assertThat(response.accessToken()).isNull();
        verify(mfaService).requestOtp(admin);
    }

    @Test
    void brokerLoginReturnsJwtDirectlyWithoutMfaChallenge() {
        User broker = User.register("broker", "broker@example.com", encoder.encode("correct-password"),
                "Broker", "0900000000");
        ReflectionTestUtils.setField(broker, "id", UUID.randomUUID());
        when(users.findByEmail("broker@example.com")).thenReturn(Optional.of(broker));
        UserPrincipal principal = UserPrincipal.from(broker);
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        LoginMfaService mfaService = Mockito.mock(LoginMfaService.class);
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                new InMemoryRateLimiter(), mfaService);

        LoginResponse response = service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                "broker@example.com", "correct-password"));

        assertThat(response.mfaRequired()).isFalse();
        assertThat(response.accessToken()).isNotBlank();
        verifyNoInteractions(mfaService);
    }
}
