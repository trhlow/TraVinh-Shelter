package com.travinh.realty.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.dto.ForgotPasswordRequest;
import com.travinh.realty.modules.auth.dto.ResetPasswordRequest;
import com.travinh.realty.modules.auth.security.InMemoryOtpStore;
import com.travinh.realty.modules.auth.security.InMemoryRateLimiter;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.notification.EmailSender;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class PasswordResetServiceTest {

    private UserRepository users;
    private OtpStore otpStore;
    private RateLimiter rateLimiter;
    private EmailSender emailSender;
    private PasswordEncoder passwordEncoder;
    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        users = Mockito.mock(UserRepository.class);
        otpStore = new InMemoryOtpStore();
        rateLimiter = new InMemoryRateLimiter();
        emailSender = Mockito.mock(EmailSender.class);
        passwordEncoder = new BCryptPasswordEncoder(4);
        service = new PasswordResetService(users, otpStore, rateLimiter, emailSender, passwordEncoder);
    }

    @Test
    void forgotPasswordForExistingEmailSendsOtpAndReturnsGenericMessage() {
        User user = User.register("broker", "broker@congtinland.vn", "hash", "Broker", "0900000000");
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));

        MessageResponse response = service.forgotPassword(new ForgotPasswordRequest("broker@congtinland.vn"));

        assertThat(response.message()).isEqualTo("Nếu email tồn tại, mã OTP đã được gửi.");
        verify(emailSender).send(eq("broker@congtinland.vn"), anyString(), anyString());
    }

    @Test
    void forgotPasswordForUnknownEmailReturnsSameMessageWithoutSendingEmail() {
        when(users.findByEmail("nobody@congtinland.vn")).thenReturn(Optional.empty());

        MessageResponse response = service.forgotPassword(new ForgotPasswordRequest("nobody@congtinland.vn"));

        assertThat(response.message()).isEqualTo("Nếu email tồn tại, mã OTP đã được gửi.");
        verifyNoInteractions(emailSender);
    }

    @Test
    void forgotPasswordWhenEmailSendFailsStillReturnsSuccessMessage() {
        User user = User.register("broker", "broker@congtinland.vn", "hash", "Broker", "0900000000");
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("smtp down")).when(emailSender).send(anyString(), anyString(), anyString());

        MessageResponse response = service.forgotPassword(new ForgotPasswordRequest("broker@congtinland.vn"));

        assertThat(response.message()).isEqualTo("Nếu email tồn tại, mã OTP đã được gửi.");
    }

    @Test
    void forgotPasswordWhenOtpGenerationFailsStillReturnsSuccessMessage() {
        User user = User.register("broker", "broker@congtinland.vn", "hash", "Broker", "0900000000");
        OtpStore failingOtpStore = Mockito.mock(OtpStore.class);
        when(failingOtpStore.generate(anyString(), any(Duration.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Redis unavailable"));
        service = new PasswordResetService(users, failingOtpStore, rateLimiter, emailSender, passwordEncoder);
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));

        MessageResponse response = service.forgotPassword(new ForgotPasswordRequest("broker@congtinland.vn"));

        assertThat(response.message()).isEqualTo("Nếu email tồn tại, mã OTP đã được gửi.");
        verifyNoInteractions(emailSender);
    }

    @Test
    void forgotPasswordIsRateLimitedAfterThreeRequests() {
        when(users.findByEmail(anyString())).thenReturn(Optional.empty());
        ForgotPasswordRequest request = new ForgotPasswordRequest("limited@congtinland.vn");
        for (int attempt = 0; attempt < 3; attempt++) {
            service.forgotPassword(request);
        }

        assertThatThrownBy(() -> service.forgotPassword(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }

    @Test
    void resetPasswordWithCorrectOtpUpdatesPasswordHash() {
        User user = User.register("broker", "broker@congtinland.vn", "old-hash", "Broker", "0900000000");
        ReflectionTestUtils.setField(user, "passwordChangedAt", Instant.now().minus(Duration.ofDays(1)));
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));
        String code = otpStore.generate("password-reset:broker@congtinland.vn", Duration.ofMinutes(10));

        MessageResponse response = service.resetPassword(
                new ResetPasswordRequest("broker@congtinland.vn", code, "NewPassword123"));

        assertThat(response.message()).isEqualTo("Mật khẩu đã được đặt lại.");
        assertThat(user.getPasswordHash()).isNotEqualTo("old-hash");
        assertThat(passwordEncoder.matches("NewPassword123", user.getPasswordHash())).isTrue();
        assertThat(user.getPasswordChangedAt()).isAfter(Instant.now().minusSeconds(10));
    }

    @Test
    void resetPasswordWithWrongOtpReturnsBadRequestAndDoesNotChangePassword() {
        User user = User.register("broker", "broker@congtinland.vn", "old-hash", "Broker", "0900000000");
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));
        otpStore.generate("password-reset:broker@congtinland.vn", Duration.ofMinutes(10));

        assertThatThrownBy(() -> service.resetPassword(
                new ResetPasswordRequest("broker@congtinland.vn", "000000", "NewPassword123")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");
        assertThat(user.getPasswordHash()).isEqualTo("old-hash");
    }

    @Test
    void resetPasswordIsRateLimitedAfterFiveAttempts() {
        ResetPasswordRequest request = new ResetPasswordRequest("limited@congtinland.vn", "000000", "NewPassword123");
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> service.resetPassword(request)).isInstanceOf(ResponseStatusException.class);
        }

        assertThatThrownBy(() -> service.resetPassword(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
        verify(users, never()).findByEmail(anyString());
    }
}
