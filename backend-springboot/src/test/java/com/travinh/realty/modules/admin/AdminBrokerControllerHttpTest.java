package com.travinh.realty.modules.admin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import tools.jackson.databind.ObjectMapper;
import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.common.config.SecurityConfig;
import com.travinh.realty.common.exception.GlobalExceptionHandler;
import com.travinh.realty.modules.admin.model.AuditAction;
import com.travinh.realty.modules.auth.security.JpaUserDetailsService;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.UserProfileService;
import com.travinh.realty.modules.user.dto.CreateBrokerRequest;
import com.travinh.realty.modules.user.dto.UserProfileResponse;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = AdminBrokerController.class)
@Import({SecurityConfig.class, JwtService.class, GlobalExceptionHandler.class,
        AdminBrokerControllerHttpTest.JwtTestConfiguration.class})
class AdminBrokerControllerHttpTest {
    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private UserProfileService profiles;
    @MockitoBean private AuditService audit;
    @MockitoBean private JpaUserDetailsService userDetailsService;
    @MockitoBean private JpaMetamodelMappingContext jpaMappingContext;

    @Test
    void nonAdminIsForbidden() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER);
        authenticate(broker);

        mockMvc.perform(get("/admin/users").header("Authorization", bearer(broker)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminListUsersForwardsStatusAndQueryFilters() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        when(profiles.listUsers(any(), any(), any())).thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/admin/users")
                        .param("status", "LOCKED")
                        .param("q", "toan")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        verify(profiles).listUsers(eq("toan"), eq(UserStatus.LOCKED), any());
    }

    @Test
    void adminListBrokersForwardsStatusAndQueryFilters() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        when(profiles.listBrokers(any(), any(), any())).thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/admin/brokers")
                        .param("status", "ACTIVE")
                        .param("q", "lan")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        verify(profiles).listBrokers(eq("lan"), eq(UserStatus.ACTIVE), any());
    }

    @Test
    void createBrokerRecordsAuditEntry() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        UUID brokerId = UUID.randomUUID();
        UserProfileResponse response = new UserProfileResponse(brokerId, "lan", "Trần Mỹ Linh", "0900000111",
                null, "lan@example.com", "https://zalo.me/lan", "https://facebook.com/lan",
                "https://tiktok.com/@lan", UserRole.BROKER, UserStatus.ACTIVE, Instant.now());
        when(profiles.createBroker(any())).thenReturn(response);
        CreateBrokerRequest request = new CreateBrokerRequest("lan", "lan@example.com", "password123",
                "Trần Mỹ Linh", "0900000111");

        mockMvc.perform(post("/admin/brokers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.zaloUrl").value("https://zalo.me/lan"))
                .andExpect(jsonPath("$.facebookUrl").value("https://facebook.com/lan"))
                .andExpect(jsonPath("$.tiktokUrl").value("https://tiktok.com/@lan"));

        verify(audit).record(eq(admin.getId()), eq(AuditAction.CREATE_BROKER), eq("User"), eq(brokerId),
                eq("Trần Mỹ Linh"), any());
    }

    @Test
    void updateUserStatusToLockedRecordsLockAudit() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        UUID userId = UUID.randomUUID();
        UserProfileResponse response = new UserProfileResponse(userId, "huy", "Phạm Quốc Huy", "0900000222",
                null, "huy@example.com", null, null, null, UserRole.USER, UserStatus.LOCKED, Instant.now());
        when(profiles.updateUserStatus(eq(userId), eq(UserStatus.LOCKED))).thenReturn(response);

        mockMvc.perform(patch("/admin/users/{userId}/status", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"LOCKED\"}")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        verify(audit).record(eq(admin.getId()), eq(AuditAction.LOCK_USER), eq("User"), eq(userId),
                eq("Phạm Quốc Huy"), any());
    }

    private void authenticate(User user) {
        when(userDetailsService.loadUserByUsername(user.getEmail()))
                .thenAnswer(invocation -> UserPrincipal.from(user));
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private User user(String email, UserRole role) {
        User user = User.register(email.substring(0, email.indexOf('@')), email, "hash", "Name", "0900000000");
        ReflectionTestUtils.setField(user, "role", role);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "status", UserStatus.ACTIVE);
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
