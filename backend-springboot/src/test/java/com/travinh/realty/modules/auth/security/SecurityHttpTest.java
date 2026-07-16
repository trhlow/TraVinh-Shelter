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
import com.travinh.realty.modules.auth.LoginMfaService;
import com.travinh.realty.modules.auth.PasswordResetService;
import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.property.PropertyController;
import com.travinh.realty.modules.property.PropertyService;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
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
    @MockitoBean private PasswordResetService passwordResetService;
    @MockitoBean private PropertyService propertyService;
    @MockitoBean private JpaUserDetailsService userDetailsService;
    @MockitoBean private JpaMetamodelMappingContext jpaMappingContext;
    @MockitoBean private LoginMfaService loginMfaService;

    @Test
    void protectedApiWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/properties"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Yêu cầu đăng nhập"));
    }

    @Test
    void nonBrokerUserIsDeniedAccessToBrokerOnlyEndpoint() throws Exception {
        User user = user("user@example.com", UserStatus.ACTIVE);
        ReflectionTestUtils.setField(user, "role", com.travinh.realty.modules.user.model.UserRole.ADMIN);
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(UserPrincipal.from(user));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/properties/mine")
                        .header("Authorization", "Bearer " + jwtService.generateToken(user)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Truy cập bị từ chối"));
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
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").value("Quá nhiều yêu cầu. Vui lòng thử lại sau."));
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

    @Test
    void forgotPasswordAlwaysReturnsOkWithGenericMessage() throws Exception {
        when(passwordResetService.forgotPassword(any()))
                .thenReturn(new MessageResponse("Nếu email tồn tại, mã OTP đã được gửi."));

        mockMvc.perform(post("/auth/forgot-password").contentType("application/json")
                        .content("{\"email\":\"someone@congtinland.vn\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Nếu email tồn tại, mã OTP đã được gửi."));
    }

    @Test
    void resetPasswordWithValidOtpReturnsOk() throws Exception {
        when(passwordResetService.resetPassword(any()))
                .thenReturn(new MessageResponse("Mật khẩu đã được đặt lại."));

        mockMvc.perform(post("/auth/reset-password").contentType("application/json")
                        .content("{\"email\":\"someone@congtinland.vn\",\"otpCode\":\"123456\",\"newPassword\":\"NewPassword123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Mật khẩu đã được đặt lại."));
    }

    @Test
    void resetPasswordWithInvalidOtpReturnsBadRequest() throws Exception {
        when(passwordResetService.resetPassword(any()))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST, "Mã OTP không hợp lệ hoặc đã hết hạn"));

        mockMvc.perform(post("/auth/reset-password").contentType("application/json")
                        .content("{\"email\":\"someone@congtinland.vn\",\"otpCode\":\"000000\",\"newPassword\":\"NewPassword123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Mã OTP không hợp lệ hoặc đã hết hạn"));
    }

    @Test
    void verifyLoginOtpWithValidCodeReturnsJwt() throws Exception {
        when(loginMfaService.verifyOtp(any())).thenReturn(new AuthResponse(
                "signed-jwt-token", "Bearer", 86_400_000L, UUID.randomUUID(), "admin@example.com", UserRole.ADMIN));

        mockMvc.perform(post("/auth/login/verify-otp").contentType("application/json")
                        .content("{\"email\":\"admin@example.com\",\"otpCode\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("signed-jwt-token"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void verifyLoginOtpWithInvalidCodeReturnsUnauthorized() throws Exception {
        when(loginMfaService.verifyOtp(any())).thenThrow(new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.UNAUTHORIZED, "Mã OTP không hợp lệ hoặc đã hết hạn"));

        mockMvc.perform(post("/auth/login/verify-otp").contentType("application/json")
                        .content("{\"email\":\"admin@example.com\",\"otpCode\":\"000000\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Mã OTP không hợp lệ hoặc đã hết hạn"));
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
