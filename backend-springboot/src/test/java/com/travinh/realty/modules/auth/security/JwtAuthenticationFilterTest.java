package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserStatus;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.util.ReflectionTestUtils;

class JwtAuthenticationFilterTest {

    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void lockedUserWithValidTokenIsNotAuthenticated() throws Exception {
        User user = user("locked@example.com", UserStatus.LOCKED);
        JwtService jwtService = new JwtService(new JwtProperties(SECRET, 60_000));
        UserDetailsService users = email -> UserPrincipal.from(user);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, users);

        assertNoAuthenticationReachesApplication(filter, jwtService.generateToken(user));
    }

    @Test
    void tokenForDeletedUserDoesNotEscapeAsServerError() throws Exception {
        User user = user("deleted@example.com", UserStatus.ACTIVE);
        JwtService jwtService = new JwtService(new JwtProperties(SECRET, 60_000));
        UserDetailsService users = email -> { throw new UsernameNotFoundException("not found"); };
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, users);

        assertNoAuthenticationReachesApplication(filter, jwtService.generateToken(user));
    }

    @Test
    void expiredWronglySignedAndMalformedTokensAreIgnored() throws Exception {
        User user = user("minh@example.com", UserStatus.ACTIVE);
        JwtService jwtService = new JwtService(new JwtProperties(SECRET, 60_000));
        JwtService expiredJwt = new JwtService(new JwtProperties(SECRET, -1));
        JwtService foreignJwt = new JwtService(new JwtProperties(
                "another-development-secret-that-is-at-least-thirty-two-bytes", 60_000));
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, email -> UserPrincipal.from(user));

        assertNoAuthenticationReachesApplication(filter, expiredJwt.generateToken(user));
        assertNoAuthenticationReachesApplication(filter, foreignJwt.generateToken(user));
        assertNoAuthenticationReachesApplication(filter, "not-a-jwt");
    }

    @Test
    void requestsWithoutBearerTokenLeaveExistingAuthenticationUntouched() throws Exception {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                new JwtService(new JwtProperties(SECRET, 60_000)), email -> { throw new AssertionError("must not load user"); });
        var existingAuthentication = new UsernamePasswordAuthenticationToken("existing-user", null);
        SecurityContextHolder.getContext().setAuthentication(existingAuthentication);
        AtomicReference<Object> authentication = new AtomicReference<>();

        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), (req, res) ->
                authentication.set(SecurityContextHolder.getContext().getAuthentication()));

        assertThat(authentication.get()).isSameAs(existingAuthentication);
    }

    private void assertNoAuthenticationReachesApplication(JwtAuthenticationFilter filter, String token) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("stale-user", null));
        AtomicReference<Object> authentication = new AtomicReference<>();
        filter.doFilter(request, new MockHttpServletResponse(), (req, res) ->
                authentication.set(SecurityContextHolder.getContext().getAuthentication()));
        assertThat(authentication.get()).isNull();
    }

    private User user(String email, UserStatus status) {
        User user = User.register("minh.nguyen", email, "hash", "Minh Nguyen", null);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "status", status);
        return user;
    }
}
