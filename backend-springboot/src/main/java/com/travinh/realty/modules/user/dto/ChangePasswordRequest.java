package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại") String currentPassword,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới") @Size(min = 8, message = "Mật khẩu mới phải có ít nhất 8 ký tự") String newPassword
) {
}
