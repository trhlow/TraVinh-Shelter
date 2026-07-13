package com.travinh.realty.modules.auth;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.auth.dto.LoginRequest;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private static final int MAX_FAILED_LOGINS_PER_ACCOUNT = 5;
    private static final Duration ACCOUNT_LOCKOUT_WINDOW = Duration.ofMinutes(15);

    private final UserRepository users; private final PasswordEncoder encoder; private final AuthenticationManager auth;
    private final JwtService jwt; private final JwtProperties properties; private final RateLimiter rateLimiter;
    public AuthService(UserRepository users, PasswordEncoder encoder, AuthenticationManager auth, JwtService jwt,
                       JwtProperties properties, RateLimiter rateLimiter) {
        this.users = users; this.encoder = encoder; this.auth = auth; this.jwt = jwt; this.properties = properties;
        this.rateLimiter = rateLimiter;
    }
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        Authentication authentication;
        try {
            authentication = auth.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (AuthenticationException exception) {
            if (!rateLimiter.tryAcquire("login-account:" + email, MAX_FAILED_LOGINS_PER_ACCOUNT, ACCOUNT_LOCKOUT_WINDOW)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
            }
            throw exception;
        }
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = users.findByEmail(principal.getUsername()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return AuthResponse.of(jwt.generateToken(user), properties.expiration(), user);
    }

    public void logout(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        jwt.revoke(authorizationHeader.substring(7));
    }
}
