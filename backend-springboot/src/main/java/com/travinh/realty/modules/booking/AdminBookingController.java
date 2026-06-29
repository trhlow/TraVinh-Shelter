package com.travinh.realty.modules.booking;

import com.travinh.realty.modules.booking.dto.UpdateViewingStatusRequest;
import com.travinh.realty.modules.booking.dto.ViewingResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
    public List<ViewingResponse> listViewings() {
        return bookings.listAll();
    }

    @PatchMapping("/viewings/{appointmentId}/status")
    public ViewingResponse updateViewingStatus(@PathVariable UUID appointmentId,
                                               @Valid @RequestBody UpdateViewingStatusRequest request) {
        return bookings.updateStatus(appointmentId, request.status());
    }
}
