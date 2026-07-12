package com.travinh.realty.modules.booking;

import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.booking.dto.RequestViewingOtpRequest;
import com.travinh.realty.modules.booking.dto.UpdateViewingStatusRequest;
import com.travinh.realty.modules.booking.dto.VerifyViewingOtpRequest;
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
import org.springframework.web.bind.annotation.PatchMapping;
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

    @PostMapping("/properties/{propertyId}/viewings/request-otp")
    @Operation(summary = "Request an SMS OTP before submitting a viewing appointment")
    public MessageResponse requestViewingOtp(@PathVariable UUID propertyId,
                                             @Valid @RequestBody RequestViewingOtpRequest request) {
        return bookings.requestOtp(propertyId, request);
    }

    @PostMapping("/properties/{propertyId}/viewings/verify-otp")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Verify the SMS OTP and submit the viewing appointment")
    public ViewingResponse verifyViewingOtp(@PathVariable UUID propertyId,
                                            @Valid @RequestBody VerifyViewingOtpRequest request) {
        return bookings.verifyOtpAndCreate(propertyId, request);
    }

    @GetMapping("/viewings/mine")
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "List viewing appointments for the current broker's properties",
            security = @SecurityRequirement(name = "bearerAuth"))
    public List<ViewingResponse> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return bookings.listForBroker(principal.id());
    }

    @PatchMapping("/viewings/mine/{appointmentId}/status")
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "Update status of a viewing appointment owned by the current broker",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ViewingResponse updateMyViewingStatus(@PathVariable UUID appointmentId,
                                                 @Valid @RequestBody UpdateViewingStatusRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        return bookings.updateStatusForBrokerOwner(appointmentId, request.status(), principal.id());
    }
}
