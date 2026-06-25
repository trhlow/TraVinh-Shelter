package com.travinh.realty.modules.media.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateVideoLinkRequest(@NotBlank @Size(max = 2048) String url) {
}
