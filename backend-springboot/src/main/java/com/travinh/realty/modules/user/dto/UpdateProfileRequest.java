package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự") String fullName,
        @Pattern(regexp = "^\\s*$|^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$",
                message = "Số điện thoại không hợp lệ") @Size(max = 30, message = "Số điện thoại không được vượt quá 30 ký tự") String phone,
        @Pattern(regexp = "^$|^https?://.*", message = "Đường dẫn Facebook không hợp lệ") @Size(max = 2048, message = "Đường dẫn Facebook không được vượt quá 2048 ký tự") String facebookUrl,
        @Pattern(regexp = "^$|^https?://.*", message = "Đường dẫn TikTok không hợp lệ") @Size(max = 2048, message = "Đường dẫn TikTok không được vượt quá 2048 ký tự") String tiktokUrl
) {
}
