package com.travinh.realty.modules.property.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Map;

public record UpdatePropertyRequest(
        Long categoryId,
        @Size(max = 100) String categorySlug,
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 500) String address,
        @NotNull @DecimalMin(value = "0.00") BigDecimal price,
        Map<String, Object> attributes
) {
}
