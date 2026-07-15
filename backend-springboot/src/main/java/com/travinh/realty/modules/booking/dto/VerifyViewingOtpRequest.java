package com.travinh.realty.modules.booking.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record VerifyViewingOtpRequest(
        @Valid @NotNull(message = "Vui lòng nhập thông tin đặt lịch") CreateViewingRequest booking,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải gồm 6 chữ số") String otpCode
) {
}
