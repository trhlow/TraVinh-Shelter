package com.travinh.realty.modules.auth.security;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.common.config.SecurityConfig;
import com.travinh.realty.common.exception.GlobalExceptionHandler;
import com.travinh.realty.modules.auth.AuthController;
import com.travinh.realty.modules.auth.AuthService;
import com.travinh.realty.modules.property.PropertyController;
import com.travinh.realty.modules.property.PropertyService;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserStatus;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {AuthController.class, PropertyController.class})
@Import({SecurityConfig.class, JwtService.class,
        GlobalExceptionHandler.class, SecurityHttpTest.JwtTestConfiguration.class})
class SecurityHttpTest {

    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockitoBean private AuthService authService;
    @MockitoBean private PropertyService propertyService;
    @MockitoBean private JpaUserDetailsService userDetailsService;
    @MockitoBean private JpaMetamodelMappingContext jpaMappingContext;

    @Test
    void protectedApiWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/properties"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void lockedUserTokenReturnsUnauthorized() throws Exception {
        User user = user("locked@example.com", UserStatus.LOCKED);
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(UserPrincipal.from(user));

        mockMvc.perform(post("/api/properties").header("Authorization", "Bearer " + jwtService.generateToken(user)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deletedUserAndInvalidTokensReturnUnauthorized() throws Exception {
        User user = user("deleted@example.com", UserStatus.ACTIVE);
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenThrow(new UsernameNotFoundException("missing"));

        mockMvc.perform(post("/api/properties").header("Authorization", "Bearer " + jwtService.generateToken(user)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/properties").header("Authorization", "Bearer malformed-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredAndWronglySignedTokensReturnUnauthorized() throws Exception {
        User user = user("minh@example.com", UserStatus.ACTIVE);
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(UserPrincipal.from(user));
        JwtService expiredJwt = new JwtService(new JwtProperties(SECRET, -1));
        JwtService foreignJwt = new JwtService(new JwtProperties(
                "another-development-secret-that-is-at-least-thirty-two-bytes", 60_000));

        mockMvc.perform(post("/api/properties").header("Authorization", "Bearer " + expiredJwt.generateToken(user)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/properties").header("Authorization", "Bearer " + foreignJwt.generateToken(user)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidLoginReturnsUnauthorized() throws Exception {
        when(authService.login(any())).thenThrow(new BadCredentialsException("bad credentials"));

        mockMvc.perform(post("/auth/login").contentType("application/json")
                        .content("{\"email\":\"minh@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void repeatedAuthAttemptsAreRateLimited() throws Exception {
        when(authService.login(any())).thenThrow(new BadCredentialsException("bad credentials"));
        for (int attempt = 0; attempt < 10; attempt++) {
            mockMvc.perform(post("/auth/login")
                            .header("X-Forwarded-For", "203.0.113.44")
                            .contentType("application/json")
                            .content("{\"email\":\"minh@example.com\",\"password\":\"wrong-password\"}"))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/auth/login")
                        .header("X-Forwarded-For", "203.0.113.44")
                        .contentType("application/json")
                        .content("{\"email\":\"minh@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void rateLimitIsTrackedPerResolvedClientIpNotGlobally() throws Exception {
        // Exercises the full chain (path-group matching -> ClientIpResolver -> RateLimiter)
        // end to end: a different X-Forwarded-For value must get its own, independent bucket
        // rather than sharing one counter with every other caller.
        when(authService.login(any())).thenThrow(new BadCredentialsException("bad credentials"));
        for (int attempt = 0; attempt < 11; attempt++) {
            mockMvc.perform(post("/auth/login")
                    .header("X-Forwarded-For", "203.0.113.10")
                    .contentType("application/json")
                    .content("{\"email\":\"minh@example.com\",\"password\":\"wrong-password\"}"));
        }

        mockMvc.perform(post("/auth/login")
                        .header("X-Forwarded-For", "203.0.113.99")
                        .contentType("application/json")
                        .content("{\"email\":\"minh@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedUserCanLogoutCurrentToken() throws Exception {
        User user = user("logout@example.com", UserStatus.ACTIVE);
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(UserPrincipal.from(user));
        String authorization = "Bearer " + jwtService.generateToken(user);

        mockMvc.perform(post("/auth/logout").header("Authorization", authorization))
                .andExpect(status().isNoContent());

        verify(authService).logout(eq(authorization));
    }

    private User user(String email, UserStatus status) {
        User user = User.register("minh.nguyen", email, "hash", "Minh Nguyen", null);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "status", status);
        return user;
    }

    @TestConfiguration
    static class JwtTestConfiguration {
        @Bean
        JwtProperties jwtProperties() {
            return new JwtProperties(SECRET, 60_000);
        }

        @Bean
        org.springframework.boot.webmvc.test.autoconfigure.MockMvcBuilderCustomizer securityMockMvcCustomizer() {
            return builder -> builder.apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity());
        }
    }
}
