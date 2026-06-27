package com.travinh.realty.modules.auth.security;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;

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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;

@WebMvcTest(controllers = {AuthController.class, PropertyController.class})
@Import({SecurityConfig.class, JwtService.class, JwtAuthenticationFilter.class,
        GlobalExceptionHandler.class, SecurityHttpTest.JwtTestConfiguration.class})
class SecurityHttpTest {

    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockBean private AuthService authService;
    @MockBean private PropertyService propertyService;
    @MockBean private JpaUserDetailsService userDetailsService;
    @MockBean private JpaMetamodelMappingContext jpaMappingContext;

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
    void authenticatedUserCanLogoutCurrentToken() throws Exception {
        User user = user("logout@example.com", UserStatus.ACTIVE);
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(UserPrincipal.from(user));
        String authorization = "Bearer " + jwtService.generateToken(user);

        mockMvc.perform(post("/auth/logout").header("Authorization", authorization))
                .andExpect(status().isNoContent());

        verify(authService).logout(eq(authorization));
    }

    @Test
    void duplicateRegistrationReturnsConflict() throws Exception {
        when(authService.register(any())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Email or username is already registered"));

        mockMvc.perform(post("/auth/register").contentType("application/json").content("""
                {"username":"minh.nguyen","email":"minh@example.com","password":"correct-horse-battery-staple","fullName":"Minh Nguyen"}
                """))
                .andExpect(status().isConflict());
    }

    @Test
    void unrelatedIntegrityErrorIsNotReportedAsDuplicateAccount() throws Exception {
        when(authService.register(any())).thenThrow(new DataIntegrityViolationException("foreign key failure"));

        mockMvc.perform(post("/auth/register").contentType("application/json").content("""
                {"username":"minh.nguyen","email":"minh@example.com","password":"correct-horse-battery-staple","fullName":"Minh Nguyen"}
                """))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"))
                .andExpect(jsonPath("$.fieldErrors").isMap())
                .andExpect(content().string(not(containsString("Resource already exists"))));
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
    }
}
