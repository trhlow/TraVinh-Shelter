package com.travinh.realty.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải gồm 6 chữ số") String otpCode,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới") @Size(min = 8, message = "Mật khẩu mới phải có ít nhất 8 ký tự") String newPassword
) {
}
