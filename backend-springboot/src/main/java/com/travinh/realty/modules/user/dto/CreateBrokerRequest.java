package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateBrokerRequest(
        @NotBlank(message = "Vui lòng nhập tên đăng nhập") @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
        @Pattern(regexp = "^[A-Za-z0-9_.-]+$", message = "Tên đăng nhập chỉ được chứa chữ, số và các ký tự _.-") String username,
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 254, message = "Email không được vượt quá 254 ký tự") String email,
        @NotBlank(message = "Vui lòng nhập mật khẩu") @Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự") String password,
        @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự") String fullName,
        @NotBlank(message = "Vui lòng nhập số điện thoại") @Size(max = 30, message = "Số điện thoại không được vượt quá 30 ký tự")
        @Pattern(regexp = "^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$",
                message = "Số điện thoại không hợp lệ") String phone
) {
}
