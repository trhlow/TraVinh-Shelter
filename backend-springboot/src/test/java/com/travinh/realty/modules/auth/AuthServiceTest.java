package com.travinh.realty.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.auth.dto.RegisterRequest;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.UUID;
import java.sql.SQLException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.dao.DataIntegrityViolationException;
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
    void registrationAlwaysCreatesActiveUserRoleAndHashesPassword() {
        when(users.existsByEmail("minh@example.com")).thenReturn(false);
        when(users.existsByUsername("minh.nguyen")).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
            return user;
        });
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties);

        AuthResponse response = service.register(new RegisterRequest(
                "minh.nguyen", "MINH@example.com", "correct-horse-battery-staple", "Minh Nguyen", "0900000000"));
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        org.mockito.Mockito.verify(users).save(savedUser.capture());

        assertThat(savedUser.getValue().getRole()).isEqualTo(UserRole.USER);
        assertThat(savedUser.getValue().getPasswordHash()).isNotEqualTo("correct-horse-battery-staple");
        assertThat(encoder.matches("correct-horse-battery-staple", savedUser.getValue().getPasswordHash())).isTrue();
        assertThat(response.email()).isEqualTo("minh@example.com");
        assertThat(response.accessToken()).isNotBlank();
    }

    @Test
    void registrationMapsUniqueConstraintRaceToConflict() {
        when(users.existsByEmail("minh@example.com")).thenReturn(false);
        when(users.existsByUsername("minh.nguyen")).thenReturn(false);
        when(users.save(any(User.class))).thenThrow(new DataIntegrityViolationException("duplicate key",
                new ConstraintViolationException("duplicate key", new SQLException(), "users_email_key")));
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties);

        assertThatThrownBy(() -> service.register(new RegisterRequest(
                "minh.nguyen", "minh@example.com", "correct-horse-battery-staple", "Minh Nguyen", null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode().value())
                .isEqualTo(409);
    }

    @Test
    void registrationDoesNotMisclassifyUnrelatedIntegrityErrorsAsDuplicateAccounts() {
        when(users.existsByEmail("minh@example.com")).thenReturn(false);
        when(users.existsByUsername("minh.nguyen")).thenReturn(false);
        DataIntegrityViolationException integrityException = new DataIntegrityViolationException("check constraint",
                new ConstraintViolationException("check constraint", new SQLException(), "users_phone_check"));
        when(users.save(any(User.class))).thenThrow(integrityException);
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties);

        assertThatThrownBy(() -> service.register(new RegisterRequest(
                "minh.nguyen", "minh@example.com", "correct-horse-battery-staple", "Minh Nguyen", null)))
                .isSameAs(integrityException);
    }

    @Test
    void loginPropagatesInvalidCredentialsForTheHttpErrorHandler() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties);

        assertThatThrownBy(() -> service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                "minh@example.com", "wrong-password")))
                .isInstanceOf(BadCredentialsException.class);
    }
}
