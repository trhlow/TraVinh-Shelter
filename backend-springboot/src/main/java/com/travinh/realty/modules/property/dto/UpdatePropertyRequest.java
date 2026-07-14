package com.travinh.realty.modules.property.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Map;

public record UpdatePropertyRequest(
        Long categoryId,
        @Size(max = 100, message = "categorySlug không được vượt quá 100 ký tự") String categorySlug,
        @NotBlank(message = "Vui lòng nhập tiêu đề") @Size(max = 255, message = "Tiêu đề không được vượt quá 255 ký tự") String title,
        @NotBlank(message = "Vui lòng nhập địa chỉ") @Size(max = 500, message = "Địa chỉ không được vượt quá 500 ký tự") String address,
        @NotNull(message = "Vui lòng nhập giá") @DecimalMin(value = "0.00", message = "Giá không được nhỏ hơn 0") BigDecimal price,
        Map<String, Object> attributes
) {
}
