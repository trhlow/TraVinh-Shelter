package com.travinh.realty.modules.admin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.common.config.SecurityConfig;
import com.travinh.realty.common.exception.GlobalExceptionHandler;
import com.travinh.realty.modules.auth.security.JpaUserDetailsService;
import com.travinh.realty.modules.auth.security.JwtAuthenticationFilter;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.UserProfileService;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = AdminBrokerController.class)
@Import({SecurityConfig.class, JwtService.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class,
        AdminBrokerControllerHttpTest.JwtTestConfiguration.class})
class AdminBrokerControllerHttpTest {
    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockBean private UserProfileService profiles;
    @MockBean private JpaUserDetailsService userDetailsService;
    @MockBean private JpaMetamodelMappingContext jpaMappingContext;

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
    }
}
