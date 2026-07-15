package com.travinh.realty.modules.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RequestViewingOtpRequest(
        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^(0|\\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$",
                message = "Số điện thoại di động không hợp lệ") String visitorPhone
) {
}
