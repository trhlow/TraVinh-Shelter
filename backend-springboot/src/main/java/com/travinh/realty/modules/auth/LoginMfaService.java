package com.travinh.realty.modules.auth;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.auth.dto.VerifyLoginOtpRequest;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.notification.EmailSender;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LoginMfaService {
    private static final Logger log = LoggerFactory.getLogger(LoginMfaService.class);
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final int REQUEST_LIMIT = 3;
    private static final Duration REQUEST_WINDOW = Duration.ofMinutes(15);
    private static final int VERIFY_LIMIT = 5;
    private static final Duration VERIFY_WINDOW = Duration.ofMinutes(10);
    private static final String INVALID_OTP_MESSAGE = "Mã OTP không hợp lệ hoặc đã hết hạn";

    private final UserRepository users;
    private final OtpStore otpStore;
    private final RateLimiter rateLimiter;
    private final EmailSender emailSender;
    private final JwtService jwt;
    private final JwtProperties properties;

    public LoginMfaService(UserRepository users, OtpStore otpStore, RateLimiter rateLimiter,
                           EmailSender emailSender, JwtService jwt, JwtProperties properties) {
        this.users = users;
        this.otpStore = otpStore;
        this.rateLimiter = rateLimiter;
        this.emailSender = emailSender;
        this.jwt = jwt;
        this.properties = properties;
    }

    public void requestOtp(User user) {
        String email = user.getEmail();
        String code = otpStore.generate("login-mfa:" + email, OTP_TTL);
        emailSender.send(email, "Mã xác minh đăng nhập - Công Tín Land",
                "Mã xác minh đăng nhập của bạn là: " + code
                        + ". Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.");
        if (!rateLimiter.tryAcquire("login-mfa-request:" + email, REQUEST_LIMIT, REQUEST_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
        }
        log.info("Login MFA OTP sent for email={}", email);
    }

    @Transactional(readOnly = true)
    public AuthResponse verifyOtp(VerifyLoginOtpRequest request) {
        String email = request.email().trim().toLowerCase();
        if (!rateLimiter.tryAcquire("login-mfa-verify:" + email, VERIFY_LIMIT, VERIFY_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
        }
        if (!otpStore.verify("login-mfa:" + email, request.otpCode())) {
            log.warn("Login MFA verification failed for email={}", email);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_OTP_MESSAGE);
        }
        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_OTP_MESSAGE));
        log.info("Login MFA verified successfully for email={}", email);
        return AuthResponse.of(jwt.generateToken(user), properties.expiration(), user);
    }
}
