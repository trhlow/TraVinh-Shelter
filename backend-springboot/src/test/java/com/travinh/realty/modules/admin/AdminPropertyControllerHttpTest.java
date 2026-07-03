package com.travinh.realty.modules.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
import com.travinh.realty.modules.property.PropertyService;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
import org.springframework.util.MultiValueMap;

@WebMvcTest(controllers = AdminPropertyController.class)
@Import({SecurityConfig.class, JwtService.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class,
        AdminPropertyControllerHttpTest.JwtTestConfiguration.class})
class AdminPropertyControllerHttpTest {
    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockBean private PropertyService properties;
    @MockBean private JpaUserDetailsService userDetailsService;
    @MockBean private JpaMetamodelMappingContext jpaMappingContext;

    @Test
    void nonAdminIsForbidden() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER);
        authenticate(broker);

        mockMvc.perform(get("/admin/properties").header("Authorization", bearer(broker)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminListForwardsStatusAndQueryFilters() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        when(properties.adminList(any(), any())).thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/admin/properties")
                        .param("status", "HIDDEN")
                        .param("q", "biet thu")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<MultiValueMap<String, String>> params = ArgumentCaptor.forClass(MultiValueMap.class);
        verify(properties).adminList(params.capture(), any());
        assertThat(params.getValue().getFirst("status")).isEqualTo("HIDDEN");
        assertThat(params.getValue().getFirst("q")).isEqualTo("biet thu");
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
