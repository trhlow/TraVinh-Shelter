package com.travinh.realty.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.auth.dto.VerifyLoginOtpRequest;
import com.travinh.realty.modules.auth.security.InMemoryOtpStore;
import com.travinh.realty.modules.auth.security.InMemoryRateLimiter;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.notification.EmailSender;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class LoginMfaServiceTest {

    private UserRepository users;
    private OtpStore otpStore;
    private RateLimiter rateLimiter;
    private EmailSender emailSender;
    private JwtService jwt;
    private JwtProperties properties;
    private LoginMfaService service;

    @BeforeEach
    void setUp() {
        users = Mockito.mock(UserRepository.class);
        otpStore = new InMemoryOtpStore();
        rateLimiter = new InMemoryRateLimiter();
        emailSender = Mockito.mock(EmailSender.class);
        properties = new JwtProperties(
                "a-development-secret-that-is-at-least-thirty-two-characters-long", 86_400_000);
        jwt = new JwtService(properties);
        service = new LoginMfaService(users, otpStore, rateLimiter, emailSender, jwt, properties);
    }

    private User admin() {
        User user = User.register("admin", "admin@congtinland.vn",
                new BCryptPasswordEncoder(4).encode("irrelevant"), "Admin", "0900000000");
        ReflectionTestUtils.setField(user, "role", UserRole.ADMIN);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        return user;
    }

    @Test
    void requestOtpSendsEmailWithCode() {
        service.requestOtp(admin());

        verify(emailSender).send(eq("admin@congtinland.vn"), anyString(), anyString());
    }

    @Test
    void requestOtpIsRateLimitedAfterThreeRequests() {
        User admin = admin();
        for (int attempt = 0; attempt < 3; attempt++) {
            service.requestOtp(admin);
        }

        assertThatThrownBy(() -> service.requestOtp(admin))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }

    @Test
    void verifyOtpWithCorrectCodeReturnsAuthResponseWithJwt() {
        User admin = admin();
        when(users.findByEmail("admin@congtinland.vn")).thenReturn(Optional.of(admin));
        String code = otpStore.generate("login-mfa:admin@congtinland.vn", Duration.ofMinutes(5));

        AuthResponse response = service.verifyOtp(new VerifyLoginOtpRequest("admin@congtinland.vn", code));

        assertThat(response.email()).isEqualTo("admin@congtinland.vn");
        assertThat(response.role()).isEqualTo(UserRole.ADMIN);
        assertThat(response.accessToken()).isNotBlank();
    }

    @Test
    void verifyOtpWithWrongCodeReturnsUnauthorized() {
        otpStore.generate("login-mfa:admin@congtinland.vn", Duration.ofMinutes(5));

        assertThatThrownBy(() -> service.verifyOtp(
                new VerifyLoginOtpRequest("admin@congtinland.vn", "000000")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("401");
    }

    @Test
    void verifyOtpIsRateLimitedAfterFiveAttempts() {
        VerifyLoginOtpRequest request = new VerifyLoginOtpRequest("limited@congtinland.vn", "000000");
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> service.verifyOtp(request)).isInstanceOf(ResponseStatusException.class);
        }

        assertThatThrownBy(() -> service.verifyOtp(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
        verify(users, never()).findByEmail(anyString());
    }
}
