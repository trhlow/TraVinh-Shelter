package com.travinh.realty.modules.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CreateViewingRequest(
        @Size(max = 100) String roomLabel,
        @NotBlank @Size(max = 150) String visitorName,
        @NotBlank @Size(max = 30) String visitorPhone,
        @Size(max = 1000) String note,
        @Size(max = 50) String expectedMoveIn,
        Integer occupants,
        Integer vehicles,
        Boolean pets,
        Instant requestedAt
) {
}
