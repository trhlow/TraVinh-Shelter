package com.travinh.realty.modules.media.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateVideoLinkRequest(
        @NotBlank(message = "Vui lòng nhập liên kết video") @Size(max = 2048, message = "Liên kết video không được vượt quá 2048 ký tự") String url
) {
}
