package com.travinh.realty.modules.booking;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.common.config.SecurityConfig;
import com.travinh.realty.common.exception.GlobalExceptionHandler;
import com.travinh.realty.modules.auth.security.JpaUserDetailsService;
import com.travinh.realty.modules.auth.security.JwtAuthenticationFilter;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.booking.dto.ViewingResponse;
import com.travinh.realty.modules.booking.model.AppointmentStatus;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {BookingController.class, AdminBookingController.class})
@Import({SecurityConfig.class, JwtService.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class,
        BookingHttpTest.JwtTestConfiguration.class})
class BookingHttpTest {
    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";
    private static final String PAYLOAD = """
            {"roomLabel":"Phòng A","visitorName":"Nguyễn Văn A","visitorPhone":"0900000000",
             "note":"Muốn xem","occupants":2}
            """;

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockBean private BookingService bookingService;
    @MockBean private JpaUserDetailsService userDetailsService;
    @MockBean private JpaMetamodelMappingContext jpaMappingContext;

    @Test
    void publicCanSubmitViewingWithoutToken() throws Exception {
        UUID propertyId = UUID.randomUUID();
        when(bookingService.create(eq(propertyId), any())).thenReturn(response(propertyId));

        mockMvc.perform(post("/properties/{id}/viewings", propertyId)
                        .contentType(MediaType.APPLICATION_JSON).content(PAYLOAD))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.visitorName").value("Nguyễn Văn A"));
    }

    @Test
    void viewingsMineRequiresBrokerRole() throws Exception {
        UUID propertyId = UUID.randomUUID();
        when(bookingService.listForBroker(any())).thenReturn(List.of(response(propertyId)));

        mockMvc.perform(get("/viewings/mine"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        User user = user("user@example.com", UserRole.USER);
        authenticate(user);
        mockMvc.perform(get("/viewings/mine").header("Authorization", bearer(user)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        User broker = user("broker@example.com", UserRole.BROKER);
        authenticate(broker);
        mockMvc.perform(get("/viewings/mine").header("Authorization", bearer(broker)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].propertyId").value(propertyId.toString()));
    }

    @Test
    void adminViewingsRequireAdminRole() throws Exception {
        UUID appointmentId = UUID.randomUUID();
        when(bookingService.listAll()).thenReturn(List.of(response(UUID.randomUUID())));
        when(bookingService.updateStatus(eq(appointmentId), eq(AppointmentStatus.CONFIRMED)))
                .thenReturn(response(UUID.randomUUID()));

        User broker = user("broker@example.com", UserRole.BROKER);
        authenticate(broker);
        mockMvc.perform(get("/admin/viewings").header("Authorization", bearer(broker)))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/admin/viewings/{id}/status", appointmentId).header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isForbidden());

        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        mockMvc.perform(get("/admin/viewings").header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/admin/viewings/{id}/status", appointmentId).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void brokerCanUpdateStatusOfOwnViewing() throws Exception {
        UUID appointmentId = UUID.randomUUID();
        User broker = user("broker@example.com", UserRole.BROKER);
        authenticate(broker);
        when(bookingService.updateStatusForBrokerOwner(eq(appointmentId), eq(AppointmentStatus.CONFIRMED), any()))
                .thenReturn(response(UUID.randomUUID()));

        // unauthenticated → 401
        mockMvc.perform(patch("/viewings/mine/{id}/status", appointmentId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isUnauthorized());

        // broker (owner) → 200
        mockMvc.perform(patch("/viewings/mine/{id}/status", appointmentId)
                        .header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void brokerWhoDoesNotOwnViewingGets403() throws Exception {
        UUID appointmentId = UUID.randomUUID();
        User broker = user("broker@example.com", UserRole.BROKER);
        authenticate(broker);
        when(bookingService.updateStatusForBrokerOwner(eq(appointmentId), any(), any()))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN, "Not your appointment"));

        mockMvc.perform(patch("/viewings/mine/{id}/status", appointmentId)
                        .header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonBrokerCannotUpdateBrokerViewingStatus() throws Exception {
        UUID appointmentId = UUID.randomUUID();
        User regularUser = user("user@example.com", UserRole.USER);
        authenticate(regularUser);

        mockMvc.perform(patch("/viewings/mine/{id}/status", appointmentId)
                        .header("Authorization", bearer(regularUser))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void repeatedViewingSubmissionsAreRateLimited() throws Exception {
        UUID propertyId = UUID.randomUUID();
        when(bookingService.create(any(), any())).thenReturn(response(propertyId));
        for (int attempt = 0; attempt < 10; attempt++) {
            mockMvc.perform(post("/properties/{id}/viewings", propertyId)
                            .header("X-Forwarded-For", "203.0.113.77")
                            .contentType(MediaType.APPLICATION_JSON).content(PAYLOAD))
                    .andExpect(status().isCreated());
        }

        mockMvc.perform(post("/properties/{id}/viewings", propertyId)
                        .header("X-Forwarded-For", "203.0.113.77")
                        .contentType(MediaType.APPLICATION_JSON).content(PAYLOAD))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    private ViewingResponse response(UUID propertyId) {
        return new ViewingResponse(UUID.randomUUID(), propertyId, "Phòng A", "Nguyễn Văn A", "0900000000",
                "Muốn xem", null, 2, null, null, null, AppointmentStatus.PENDING, Instant.now());
    }

    private void authenticate(User user) {
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenAnswer(invocation -> UserPrincipal.from(user));
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private User user(String email, UserRole role) {
        User user = role == UserRole.BROKER
                ? User.createBroker(email.substring(0, email.indexOf('@')), email, "hash", "Name", "0900000000")
                : User.register(email.substring(0, email.indexOf('@')), email, "hash", "Name", "0900000000");
        if (role == UserRole.ADMIN) {
            ReflectionTestUtils.setField(user, "role", UserRole.ADMIN);
        }
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
