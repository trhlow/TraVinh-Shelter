package com.travinh.realty.modules.booking;

import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.booking.dto.CreateViewingRequest;
import com.travinh.realty.modules.booking.dto.ViewingResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Viewings", description = "Submit and review property viewing appointments")
public class BookingController {
    private final BookingService bookings;

    public BookingController(BookingService bookings) {
        this.bookings = bookings;
    }

    @PostMapping("/properties/{propertyId}/viewings")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Submit a public viewing appointment for a property")
    public ViewingResponse submit(@PathVariable UUID propertyId,
                                  @Valid @RequestBody CreateViewingRequest request) {
        return bookings.create(propertyId, request);
    }

    @GetMapping("/viewings/mine")
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "List viewing appointments for the current broker's properties",
            security = @SecurityRequirement(name = "bearerAuth"))
    public List<ViewingResponse> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return bookings.listForBroker(principal.id());
    }
}
