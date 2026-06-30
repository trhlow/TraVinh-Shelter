package com.travinh.realty.modules.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CreateViewingRequest(
        @Size(max = 100) String roomLabel,
        @NotBlank @Size(max = 150) String visitorName,
        @NotBlank @Size(max = 30)
        @Pattern(regexp = "^(0|\\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$",
                message = "Số điện thoại di động không hợp lệ") String visitorPhone,
        @Size(max = 1000) String note,
        @Size(max = 50) String expectedMoveIn,
        Integer occupants,
        Integer vehicles,
        Boolean pets,
        Instant requestedAt
) {
}
