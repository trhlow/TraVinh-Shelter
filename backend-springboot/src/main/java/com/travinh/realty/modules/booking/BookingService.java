package com.travinh.realty.modules.booking;

import com.travinh.realty.modules.booking.dto.CreateViewingRequest;
import com.travinh.realty.modules.booking.dto.ViewingResponse;
import com.travinh.realty.modules.booking.model.AppointmentStatus;
import com.travinh.realty.modules.booking.model.ViewingAppointment;
import com.travinh.realty.modules.booking.repository.ViewingAppointmentRepository;
import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.model.PropertyStatus;
import com.travinh.realty.modules.property.repository.PropertyRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingService {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ViewingAppointmentRepository appointments;
    private final PropertyRepository properties;

    public BookingService(ViewingAppointmentRepository appointments, PropertyRepository properties) {
        this.appointments = appointments;
        this.properties = properties;
    }

    @Transactional
    public ViewingResponse create(UUID propertyId, CreateViewingRequest request) {
        Property property = properties.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        if (property.getStatus() != PropertyStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found");
        }
        validateSchedule(request);
        ViewingAppointment appointment = ViewingAppointment.create(propertyId, request);
        return ViewingResponse.of(appointments.save(appointment));
    }

    private void validateSchedule(CreateViewingRequest request) {
        Instant requestedAt = request.requestedAt();
        if (requestedAt == null) {
            return;
        }
        if (requestedAt.isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày xem không được ở quá khứ");
        }
        String expectedMoveIn = request.expectedMoveIn();
        if (expectedMoveIn == null || expectedMoveIn.isBlank()) {
            return;
        }
        try {
            LocalDate moveIn = LocalDate.parse(expectedMoveIn.trim());
            LocalDate viewDate = requestedAt.atZone(VN_ZONE).toLocalDate();
            if (moveIn.isBefore(viewDate)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Ngày vào ở không được trước ngày xem");
            }
        } catch (DateTimeParseException ignored) {
            // expectedMoveIn is a free-form VARCHAR; skip the cross-field check when it is not an ISO date.
        }
    }

    @Transactional(readOnly = true)
    public List<ViewingResponse> listForBroker(UUID brokerId) {
        List<UUID> propertyIds = properties.findIdsByBrokerId(brokerId);
        if (propertyIds.isEmpty()) {
            return List.of();
        }
        return appointments.findByPropertyIdInOrderByCreatedAtDesc(propertyIds).stream()
                .map(ViewingResponse::of)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<ViewingResponse> listAll(String query, AppointmentStatus status, Pageable pageable) {
        Specification<ViewingAppointment> spec = Specification.allOf(Stream.of(
                ViewingSpecifications.matchesQuery(query),
                ViewingSpecifications.hasStatus(status))
                .filter(Objects::nonNull)
                .toList());
        Pageable effective = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                        Sort.by(Sort.Direction.DESC, "createdAt"));
        return appointments.findAll(spec, effective).map(ViewingResponse::of);
    }

    @Transactional
    public ViewingResponse updateStatus(UUID appointmentId, AppointmentStatus status) {
        ViewingAppointment appointment = appointments.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        appointment.changeStatus(status);
        return ViewingResponse.of(appointment);
    }

    /**
     * Broker-scoped status update: only the broker who owns the property may change the status.
     * Throws 404 NOT_FOUND (not 403) if the appointment's property does not belong to the given
     * broker — intentional, matches the true-not-found case, to prevent resource enumeration via
     * ownership probing.
     */
    @Transactional
    public ViewingResponse updateStatusForBrokerOwner(UUID appointmentId, AppointmentStatus status, UUID brokerId) {
        ViewingAppointment appointment = appointments.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        List<UUID> brokerPropertyIds = properties.findIdsByBrokerId(brokerId);
        if (!brokerPropertyIds.contains(appointment.getPropertyId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found");
        }
        appointment.changeStatus(status);
        return ViewingResponse.of(appointment);
    }
}
