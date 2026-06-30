package com.travinh.realty.modules.booking.dto;

import com.travinh.realty.modules.booking.model.AppointmentStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateViewingStatusRequest(@NotNull AppointmentStatus status) {
}
