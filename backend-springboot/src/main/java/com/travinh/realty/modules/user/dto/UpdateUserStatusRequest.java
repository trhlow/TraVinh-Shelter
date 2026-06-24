package com.travinh.realty.modules.user.dto;

import com.travinh.realty.modules.user.model.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(@NotNull UserStatus status) {
}
