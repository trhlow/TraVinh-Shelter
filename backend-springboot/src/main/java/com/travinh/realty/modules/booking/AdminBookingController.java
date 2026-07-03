package com.travinh.realty.modules.booking;

import com.travinh.realty.common.dto.PagedResponse;
import com.travinh.realty.modules.booking.dto.UpdateViewingStatusRequest;
import com.travinh.realty.modules.booking.dto.ViewingResponse;
import com.travinh.realty.modules.booking.model.AppointmentStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBookingController {
    private final BookingService bookings;

    public AdminBookingController(BookingService bookings) {
        this.bookings = bookings;
    }

    @GetMapping("/viewings")
    public PagedResponse<ViewingResponse> listViewings(@RequestParam(required = false) String q,
                                                       @RequestParam(required = false) AppointmentStatus status,
                                                       @PageableDefault(size = 50) Pageable pageable) {
        return PagedResponse.from(bookings.listAll(q, status, pageable));
    }

    @PatchMapping("/viewings/{appointmentId}/status")
    public ViewingResponse updateViewingStatus(@PathVariable UUID appointmentId,
                                               @Valid @RequestBody UpdateViewingStatusRequest request) {
        return bookings.updateStatus(appointmentId, request.status());
    }
}
