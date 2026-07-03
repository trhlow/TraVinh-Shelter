package com.travinh.realty.modules.booking;

import static org.assertj.core.api.Assertions.assertThat;

import com.travinh.realty.modules.booking.dto.CreateViewingRequest;
import com.travinh.realty.modules.booking.dto.ViewingResponse;
import com.travinh.realty.modules.booking.model.AppointmentStatus;
import com.travinh.realty.modules.booking.model.ViewingAppointment;
import com.travinh.realty.modules.booking.repository.ViewingAppointmentRepository;
import com.travinh.realty.modules.property.model.Category;
import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.repository.CategoryRepository;
import com.travinh.realty.modules.property.repository.PropertyRepository;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes")
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class ViewingFilterIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("tv_realty_viewing_filter_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    private static final String TOKEN = "zzview";
    private static final PageRequest PAGE = PageRequest.of(0, 50);

    @Autowired private BookingService bookings;
    @Autowired private ViewingAppointmentRepository appointments;
    @Autowired private PropertyRepository properties;
    @Autowired private CategoryRepository categories;
    @Autowired private UserRepository users;

    private ViewingAppointment pending;
    private ViewingAppointment confirmed;
    private ViewingAppointment other;

    @BeforeEach
    void seed() {
        User broker = users.save(User.createBroker("zzview.broker", "zzview.broker@example.com",
                "hash", "Zzview Broker", "0911000009"));
        Category tro = categories.findBySlug("tro").orElseThrow();
        Property property = properties.save(Property.create(broker, tro, "Zzview property", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), Map.of()));
        UUID propertyId = property.getId();

        pending = save(propertyId, TOKEN + " Alpha", "0911000001", AppointmentStatus.PENDING);
        confirmed = save(propertyId, TOKEN + " Beta", "0911000002", AppointmentStatus.CONFIRMED);
        other = save(propertyId, "Gamma visitor", "0911000003", AppointmentStatus.PENDING);
    }

    @Test
    void filtersByVisitorNameQuery() {
        Page<ViewingResponse> result = bookings.listAll(TOKEN, null, PAGE);

        assertThat(result.getContent()).extracting(ViewingResponse::id)
                .containsExactlyInAnyOrder(pending.getId(), confirmed.getId());
    }

    @Test
    void filtersByVisitorPhoneQuery() {
        Page<ViewingResponse> result = bookings.listAll("0911000003", null, PAGE);

        assertThat(result.getContent()).extracting(ViewingResponse::id).containsExactly(other.getId());
    }

    @Test
    void filtersByStatus() {
        Page<ViewingResponse> result = bookings.listAll(null, AppointmentStatus.CONFIRMED, PAGE);

        assertThat(result.getContent()).extracting(ViewingResponse::id).containsExactly(confirmed.getId());
    }

    @Test
    void reportsPaginationMetadata() {
        Page<ViewingResponse> firstPage = bookings.listAll(null, null, PageRequest.of(0, 2));

        assertThat(firstPage.getTotalElements()).isEqualTo(3);
        assertThat(firstPage.getContent()).hasSize(2);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
    }

    private ViewingAppointment save(UUID propertyId, String visitorName, String visitorPhone,
                                    AppointmentStatus status) {
        CreateViewingRequest request = new CreateViewingRequest(null, visitorName, visitorPhone,
                null, null, null, null, null, null);
        ViewingAppointment appointment = ViewingAppointment.create(propertyId, request);
        appointment.changeStatus(status);
        return appointments.save(appointment);
    }
}
