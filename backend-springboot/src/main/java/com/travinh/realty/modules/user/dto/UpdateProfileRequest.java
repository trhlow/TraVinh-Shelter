package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 150) String fullName,
        @Size(max = 30) String phone,
        @Pattern(regexp = "^$|^https?://.*", message = "facebookUrl must be a valid http(s) URL") @Size(max = 2048) String facebookUrl,
        @Pattern(regexp = "^$|^https?://.*", message = "tiktokUrl must be a valid http(s) URL") @Size(max = 2048) String tiktokUrl
) {
}
