package com.travinh.realty.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyLoginOtpRequest(
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải gồm 6 chữ số") String otpCode
) {
}
