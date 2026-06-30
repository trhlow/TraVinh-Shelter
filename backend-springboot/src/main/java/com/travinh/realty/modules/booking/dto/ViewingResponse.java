package com.travinh.realty.modules.booking.dto;

import com.travinh.realty.modules.booking.model.AppointmentStatus;
import com.travinh.realty.modules.booking.model.ViewingAppointment;
import java.time.Instant;
import java.util.UUID;

public record ViewingResponse(UUID id, UUID propertyId, String roomLabel, String visitorName,
                              String visitorPhone, String note, String expectedMoveIn, Integer occupants,
                              Integer vehicles, Boolean pets, Instant requestedAt, AppointmentStatus status,
                              Instant createdAt) {
    public static ViewingResponse of(ViewingAppointment appointment) {
        return new ViewingResponse(appointment.getId(), appointment.getPropertyId(), appointment.getRoomLabel(),
                appointment.getVisitorName(), appointment.getVisitorPhone(), appointment.getNote(),
                appointment.getExpectedMoveIn(), appointment.getOccupants(), appointment.getVehicles(),
                appointment.getPets(), appointment.getRequestedAt(), appointment.getStatus(),
                appointment.getCreatedAt());
    }
}
