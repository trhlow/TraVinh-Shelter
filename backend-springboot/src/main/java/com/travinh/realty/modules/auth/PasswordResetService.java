package com.travinh.realty.modules.auth;

import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.dto.ForgotPasswordRequest;
import com.travinh.realty.modules.auth.dto.ResetPasswordRequest;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.notification.EmailSender;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PasswordResetService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final Duration OTP_TTL = Duration.ofMinutes(10);
    private static final int REQUEST_LIMIT = 3;
    private static final Duration REQUEST_WINDOW = Duration.ofMinutes(15);
    private static final int VERIFY_LIMIT = 5;
    private static final Duration VERIFY_WINDOW = Duration.ofMinutes(10);
    private static final String GENERIC_SUCCESS_MESSAGE = "Nếu email tồn tại, mã OTP đã được gửi.";
    private static final String INVALID_OTP_MESSAGE = "Mã OTP không hợp lệ hoặc đã hết hạn";

    private final UserRepository users;
    private final OtpStore otpStore;
    private final RateLimiter rateLimiter;
    private final EmailSender emailSender;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetService(UserRepository users, OtpStore otpStore, RateLimiter rateLimiter,
                                EmailSender emailSender, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.otpStore = otpStore;
        this.rateLimiter = rateLimiter;
        this.emailSender = emailSender;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().trim().toLowerCase();
        if (!rateLimiter.tryAcquire("password-reset-request:" + email, REQUEST_LIMIT, REQUEST_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
        }
        Optional<User> user = users.findByEmail(email);
        if (user.isPresent()) {
            String code = otpStore.generate("password-reset:" + email, OTP_TTL);
            try {
                emailSender.send(email, "Mã OTP khôi phục mật khẩu - Công Tín Land",
                        "Mã OTP khôi phục mật khẩu của bạn là: " + code
                                + ". Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.");
            } catch (RuntimeException exception) {
                log.error("Failed to send password reset email to {}", email, exception);
            }
        }
        return new MessageResponse(GENERIC_SUCCESS_MESSAGE);
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        String email = request.email().trim().toLowerCase();
        if (!rateLimiter.tryAcquire("password-reset-verify:" + email, VERIFY_LIMIT, VERIFY_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
        }
        if (!otpStore.verify("password-reset:" + email, request.otpCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_OTP_MESSAGE);
        }
        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_OTP_MESSAGE));
        user.updatePasswordHash(passwordEncoder.encode(request.newPassword()));
        return new MessageResponse("Mật khẩu đã được đặt lại.");
    }
}
