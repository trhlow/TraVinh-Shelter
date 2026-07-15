package com.travinh.realty.modules.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CreateViewingRequest(
        @Size(max = 100, message = "Tên phòng không được vượt quá 100 ký tự") String roomLabel,
        @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự") String visitorName,
        @NotBlank(message = "Vui lòng nhập số điện thoại") @Size(max = 30, message = "Số điện thoại không được vượt quá 30 ký tự")
        @Pattern(regexp = "^(0|\\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$",
                message = "Số điện thoại di động không hợp lệ") String visitorPhone,
        @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự") String note,
        @Size(max = 50, message = "Ngày dự kiến vào ở không được vượt quá 50 ký tự") String expectedMoveIn,
        Integer occupants,
        Integer vehicles,
        Boolean pets,
        Instant requestedAt
) {
}
