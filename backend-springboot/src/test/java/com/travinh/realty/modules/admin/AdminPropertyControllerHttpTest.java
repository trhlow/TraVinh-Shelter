package com.travinh.realty.modules.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.common.config.SecurityConfig;
import com.travinh.realty.common.exception.GlobalExceptionHandler;
import com.travinh.realty.modules.admin.model.AuditAction;
import com.travinh.realty.modules.auth.security.JpaUserDetailsService;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.property.PropertyService;
import com.travinh.realty.modules.property.dto.BrokerSummaryResponse;
import com.travinh.realty.modules.property.dto.CategoryResponse;
import com.travinh.realty.modules.property.dto.PropertyResponse;
import com.travinh.realty.modules.property.model.PropertyStatus;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
import org.springframework.util.MultiValueMap;

@WebMvcTest(controllers = AdminPropertyController.class)
@Import({SecurityConfig.class, JwtService.class, GlobalExceptionHandler.class,
        AdminPropertyControllerHttpTest.JwtTestConfiguration.class})
class AdminPropertyControllerHttpTest {
    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockitoBean private PropertyService properties;
    @MockitoBean private com.travinh.realty.modules.admin.AuditService audit;
    @MockitoBean private JpaUserDetailsService userDetailsService;
    @MockitoBean private JpaMetamodelMappingContext jpaMappingContext;

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

    @Test
    void updateStatusToHiddenRecordsHidePropertyAudit() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        UUID propertyId = UUID.randomUUID();
        when(properties.adminUpdateStatus(propertyId, PropertyStatus.HIDDEN))
                .thenReturn(propertyResponse(propertyId, "Nhà mới đường Nguyễn Đáng", PropertyStatus.HIDDEN));

        mockMvc.perform(patch("/admin/properties/{propertyId}/status", propertyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"HIDDEN\"}")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        verify(audit).record(eq(admin.getId()), eq(AuditAction.HIDE_PROPERTY), eq("Property"), eq(propertyId),
                eq("Nhà mới đường Nguyễn Đáng"), any());
    }

    @Test
    void updateStatusToRentedRecordsUpdatePropertyStatusAudit() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        UUID propertyId = UUID.randomUUID();
        when(properties.adminUpdateStatus(propertyId, PropertyStatus.RENTED))
                .thenReturn(propertyResponse(propertyId, "Nhà mới đường Nguyễn Đáng", PropertyStatus.RENTED));

        mockMvc.perform(patch("/admin/properties/{propertyId}/status", propertyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RENTED\"}")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        verify(audit).record(eq(admin.getId()), eq(AuditAction.UPDATE_PROPERTY_STATUS), eq("Property"), eq(propertyId),
                eq("Nhà mới đường Nguyễn Đáng"), any());
    }

    private PropertyResponse propertyResponse(UUID id, String title, PropertyStatus status) {
        return new PropertyResponse(id, new CategoryResponse(1L, "Nhà", "nha", null),
                new BrokerSummaryResponse(UUID.randomUUID(), "Môi giới", "0900000000", null,
                        "broker@example.com", null, null, null),
                title, "Trà Vinh", BigDecimal.valueOf(1_000_000_000), status, Map.of(), Instant.now(), Instant.now());
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
