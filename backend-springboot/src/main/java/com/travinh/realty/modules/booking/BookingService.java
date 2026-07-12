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

import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.booking.dto.RequestViewingOtpRequest;
import com.travinh.realty.modules.booking.dto.VerifyViewingOtpRequest;
import com.travinh.realty.modules.notification.SmsSender;
import java.time.Duration;

@Service
public class BookingService {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Duration OTP_TTL = Duration.ofMinutes(10);
    private static final int REQUEST_LIMIT = 3;
    private static final Duration REQUEST_WINDOW = Duration.ofMinutes(15);
    private static final int VERIFY_LIMIT = 5;
    private static final Duration VERIFY_WINDOW = Duration.ofMinutes(5);
    private static final String INVALID_OTP_MESSAGE = "Mã OTP không hợp lệ hoặc đã hết hạn";

    private final ViewingAppointmentRepository appointments;
    private final PropertyRepository properties;
    private final OtpStore otpStore;
    private final RateLimiter rateLimiter;
    private final SmsSender smsSender;

    public BookingService(ViewingAppointmentRepository appointments, PropertyRepository properties,
                          OtpStore otpStore, RateLimiter rateLimiter, SmsSender smsSender) {
        this.appointments = appointments;
        this.properties = properties;
        this.otpStore = otpStore;
        this.rateLimiter = rateLimiter;
        this.smsSender = smsSender;
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

    @Transactional(readOnly = true)
    public MessageResponse requestOtp(UUID propertyId, RequestViewingOtpRequest request) {
        Property property = properties.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        if (property.getStatus() != PropertyStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found");
        }
        String phone = request.visitorPhone().trim();
        if (!rateLimiter.tryAcquire("viewing-otp-request:" + phone, REQUEST_LIMIT, REQUEST_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
        }
        String code = otpStore.generate("viewing-otp:" + phone, OTP_TTL);
        smsSender.send(phone, "Ma OTP xac minh dat lich xem nha cua ban la: " + code + ". Ma co hieu luc 10 phut.");
        return new MessageResponse("Mã OTP đã được gửi qua SMS.");
    }

    @Transactional
    public ViewingResponse verifyOtpAndCreate(UUID propertyId, VerifyViewingOtpRequest request) {
        String phone = request.booking().visitorPhone().trim();
        if (!rateLimiter.tryAcquire("viewing-otp-verify:" + phone, VERIFY_LIMIT, VERIFY_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
        }
        if (!otpStore.verify("viewing-otp:" + phone, request.otpCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_OTP_MESSAGE);
        }
        return create(propertyId, request.booking());
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
