package com.travinh.realty.modules.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

import com.travinh.realty.modules.booking.dto.CreateViewingRequest;
import com.travinh.realty.modules.booking.dto.ViewingResponse;
import com.travinh.realty.modules.booking.model.AppointmentStatus;
import com.travinh.realty.modules.booking.model.ViewingAppointment;
import com.travinh.realty.modules.booking.repository.ViewingAppointmentRepository;
import com.travinh.realty.modules.property.model.Category;
import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.model.PropertyStatus;
import com.travinh.realty.modules.property.repository.PropertyRepository;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class BookingServiceTest {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private ViewingAppointmentRepository appointments;
    private PropertyRepository properties;
    private BookingService service;

    @BeforeEach
    void setUp() {
        appointments = Mockito.mock(ViewingAppointmentRepository.class);
        properties = Mockito.mock(PropertyRepository.class);
        service = new BookingService(appointments, properties);
    }

    @Test
    void createPersistsPendingAppointment() {
        Property property = property(broker(), PropertyStatus.AVAILABLE);
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));
        when(appointments.save(any(ViewingAppointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateViewingRequest request = new CreateViewingRequest("Phòng A", "Nguyễn Văn A", "0900000000",
                "Muốn xem chiều", "2026-07-01", 2, 1, false, null);
        ViewingResponse response = service.create(property.getId(), request);

        ArgumentCaptor<ViewingAppointment> saved = ArgumentCaptor.forClass(ViewingAppointment.class);
        Mockito.verify(appointments).save(saved.capture());
        assertThat(saved.getValue().getPropertyId()).isEqualTo(property.getId());
        assertThat(saved.getValue().getVisitorName()).isEqualTo("Nguyễn Văn A");
        assertThat(saved.getValue().getStatus()).isEqualTo(AppointmentStatus.PENDING);
        assertThat(response.status()).isEqualTo(AppointmentStatus.PENDING);
        assertThat(response.visitorPhone()).isEqualTo("0900000000");
    }

    @Test
    void createOnMissingPropertyReturnsNotFound() {
        UUID missing = UUID.randomUUID();
        when(properties.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(missing, request()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void createOnHiddenPropertyReturnsNotFound() {
        Property hidden = property(broker(), PropertyStatus.HIDDEN);
        when(properties.findById(hidden.getId())).thenReturn(Optional.of(hidden));

        assertThatThrownBy(() -> service.create(hidden.getId(), request()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void createOnSoldPropertyReturnsNotFound() {
        Property sold = property(broker(), PropertyStatus.SOLD);
        when(properties.findById(sold.getId())).thenReturn(Optional.of(sold));

        assertThatThrownBy(() -> service.create(sold.getId(), request()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void createWithPastRequestedAtReturnsBadRequest() {
        Property property = property(broker(), PropertyStatus.AVAILABLE);
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));

        CreateViewingRequest request = new CreateViewingRequest(null, "Nguyễn Văn A", "0900000000",
                null, null, null, null, null, Instant.now().minusSeconds(3600));

        assertThatThrownBy(() -> service.create(property.getId(), request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");
    }

    @Test
    void createWithMoveInBeforeViewDateReturnsBadRequest() {
        Property property = property(broker(), PropertyStatus.AVAILABLE);
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));

        Instant viewDate = LocalDate.now(VN_ZONE).plusDays(10).atStartOfDay(VN_ZONE).toInstant();
        String moveIn = LocalDate.now(VN_ZONE).plusDays(9).toString();
        CreateViewingRequest request = new CreateViewingRequest(null, "Nguyễn Văn A", "0900000000",
                null, moveIn, null, null, null, viewDate);

        assertThatThrownBy(() -> service.create(property.getId(), request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");
    }

    @Test
    void createWithMoveInOnOrAfterViewDatePersists() {
        Property property = property(broker(), PropertyStatus.AVAILABLE);
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));
        when(appointments.save(any(ViewingAppointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant viewDate = LocalDate.now(VN_ZONE).plusDays(5).atStartOfDay(VN_ZONE).toInstant();
        String moveIn = LocalDate.now(VN_ZONE).plusDays(5).toString();
        CreateViewingRequest request = new CreateViewingRequest(null, "Nguyễn Văn A", "0900000000",
                null, moveIn, null, null, null, viewDate);

        ViewingResponse response = service.create(property.getId(), request);
        assertThat(response.status()).isEqualTo(AppointmentStatus.PENDING);
    }

    @Test
    void createWithUnparseableMoveInStillPersists() {
        Property property = property(broker(), PropertyStatus.AVAILABLE);
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));
        when(appointments.save(any(ViewingAppointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant viewDate = LocalDate.now(VN_ZONE).plusDays(5).atStartOfDay(VN_ZONE).toInstant();
        CreateViewingRequest request = new CreateViewingRequest(null, "Nguyễn Văn A", "0900000000",
                null, "01/08/2025", null, null, null, viewDate);

        ViewingResponse response = service.create(property.getId(), request);
        assertThat(response.status()).isEqualTo(AppointmentStatus.PENDING);
    }

    @Test
    void listForBrokerReturnsAppointmentsForBrokerProperties() {
        UUID brokerId = UUID.randomUUID();
        UUID propertyId = UUID.randomUUID();
        when(properties.findIdsByBrokerId(brokerId)).thenReturn(List.of(propertyId));
        ViewingAppointment appointment = appointment(propertyId, AppointmentStatus.PENDING);
        when(appointments.findByPropertyIdInOrderByCreatedAtDesc(anyCollection()))
                .thenReturn(List.of(appointment));

        List<ViewingResponse> result = service.listForBroker(brokerId);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().propertyId()).isEqualTo(propertyId);
    }

    @Test
    void listForBrokerWithoutPropertiesReturnsEmpty() {
        UUID brokerId = UUID.randomUUID();
        when(properties.findIdsByBrokerId(brokerId)).thenReturn(List.of());

        assertThat(service.listForBroker(brokerId)).isEmpty();
        Mockito.verify(appointments, Mockito.never()).findByPropertyIdInOrderByCreatedAtDesc(anyCollection());
    }

    @Test
    void listAllReturnsEveryAppointment() {
        when(appointments.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(appointment(UUID.randomUUID(), AppointmentStatus.PENDING),
                        appointment(UUID.randomUUID(), AppointmentStatus.CONFIRMED)));

        assertThat(service.listAll()).hasSize(2);
    }

    @Test
    void updateStatusChangesStatus() {
        ViewingAppointment appointment = appointment(UUID.randomUUID(), AppointmentStatus.PENDING);
        when(appointments.findById(appointment.getId())).thenReturn(Optional.of(appointment));

        ViewingResponse response = service.updateStatus(appointment.getId(), AppointmentStatus.CONFIRMED);

        assertThat(appointment.getStatus()).isEqualTo(AppointmentStatus.CONFIRMED);
        assertThat(response.status()).isEqualTo(AppointmentStatus.CONFIRMED);
    }

    @Test
    void updateStatusOnMissingAppointmentReturnsNotFound() {
        UUID missing = UUID.randomUUID();
        when(appointments.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateStatus(missing, AppointmentStatus.CANCELLED))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void updateStatusForBrokerOwner_ownerSucceedsAndStatusPersists() {
        User broker = broker();
        UUID brokerId = broker.getId();
        UUID propertyId = UUID.randomUUID();
        ViewingAppointment appointment = appointment(propertyId, AppointmentStatus.PENDING);

        when(appointments.findById(appointment.getId())).thenReturn(Optional.of(appointment));
        when(properties.findIdsByBrokerId(brokerId)).thenReturn(List.of(propertyId));

        ViewingResponse response = service.updateStatusForBrokerOwner(appointment.getId(), AppointmentStatus.CONFIRMED, brokerId);

        assertThat(appointment.getStatus()).isEqualTo(AppointmentStatus.CONFIRMED);
        assertThat(response.status()).isEqualTo(AppointmentStatus.CONFIRMED);
    }

    @Test
    void updateStatusForBrokerOwner_nonOwnerGetsForbidden() {
        UUID propertyId = UUID.randomUUID();
        UUID otherBrokerId = UUID.randomUUID();
        ViewingAppointment appointment = appointment(propertyId, AppointmentStatus.PENDING);

        when(appointments.findById(appointment.getId())).thenReturn(Optional.of(appointment));
        // otherBroker owns no properties containing this appointment's property
        when(properties.findIdsByBrokerId(otherBrokerId)).thenReturn(List.of(UUID.randomUUID()));

        assertThatThrownBy(() -> service.updateStatusForBrokerOwner(appointment.getId(), AppointmentStatus.CONFIRMED, otherBrokerId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");
    }

    private CreateViewingRequest request() {
        return new CreateViewingRequest(null, "Nguyễn Văn A", "0900000000", null, null, null, null, null, null);
    }

    private ViewingAppointment appointment(UUID propertyId, AppointmentStatus status) {
        ViewingAppointment appointment = ViewingAppointment.create(propertyId, request());
        ReflectionTestUtils.setField(appointment, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(appointment, "status", status);
        return appointment;
    }

    private User broker() {
        User broker = User.createBroker("broker", "broker@example.com", "hash", "Broker", "0900000000");
        ReflectionTestUtils.setField(broker, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(broker, "role", UserRole.BROKER);
        return broker;
    }

    private Property property(User broker, PropertyStatus status) {
        Property property = Property.create(broker, newCategory(), "Phòng trọ", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), Map.of());
        property.changeStatus(status);
        ReflectionTestUtils.setField(property, "id", UUID.randomUUID());
        return property;
    }

    private Category newCategory() {
        try {
            java.lang.reflect.Constructor<Category> constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
