package com.travinh.realty.modules.property.dto;

import com.travinh.realty.modules.property.model.PropertyStatus;
import jakarta.validation.constraints.NotNull;

public record UpdatePropertyStatusRequest(@NotNull PropertyStatus status) {
}
