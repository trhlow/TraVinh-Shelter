package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateBrokerRequest(
        @NotBlank @Size(min = 3, max = 50)
        @Pattern(regexp = "^[A-Za-z0-9_.-]+$") String username,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(max = 30)
        @Pattern(regexp = "^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$",
                message = "phone must be a valid Vietnamese mobile number") String phone
) {
}
