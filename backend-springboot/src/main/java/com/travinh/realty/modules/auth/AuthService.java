package com.travinh.realty.modules.auth;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.auth.dto.LoginRequest;
import com.travinh.realty.modules.auth.dto.RegisterRequest;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.UserIdentityConstraints;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final UserRepository users; private final PasswordEncoder encoder; private final AuthenticationManager auth;
    private final JwtService jwt; private final JwtProperties properties;
    public AuthService(UserRepository users, PasswordEncoder encoder, AuthenticationManager auth, JwtService jwt, JwtProperties properties) {
        this.users = users; this.encoder = encoder; this.auth = auth; this.jwt = jwt; this.properties = properties;
    }
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(); String username = request.username().trim();
        String phone = blankToNull(request.phone());
        if (users.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        if (users.existsByUsername(username)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already registered");
        if (phone != null && users.existsByNormalizedPhone(normalizePhoneForLookup(phone))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered");
        }
        try {
            User saved = users.save(User.register(username, email, encoder.encode(request.password()), request.fullName().trim(), phone));
            users.flush();
            return AuthResponse.of(jwt.generateToken(saved), properties.expiration(), saved);
        } catch (DataIntegrityViolationException exception) {
            if (UserIdentityConstraints.isDuplicateEmailOrUsername(exception)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email or username is already registered", exception);
            }
            if (UserIdentityConstraints.isDuplicatePhone(exception)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered", exception);
            }
            throw exception;
        }
    }
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = auth.authenticate(new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(), request.password()));
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

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private String normalizePhoneForLookup(String value) { return value.replaceAll("\\s+", ""); }

}
