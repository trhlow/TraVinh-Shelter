package com.travinh.realty.modules.booking.model;

import com.travinh.realty.modules.booking.dto.CreateViewingRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "viewing_appointments")
public class ViewingAppointment {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "room_label")
    private String roomLabel;

    @Column(name = "visitor_name", nullable = false)
    private String visitorName;

    @Column(name = "visitor_phone", nullable = false)
    private String visitorPhone;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "expected_move_in")
    private String expectedMoveIn;

    @Column(name = "occupants")
    private Integer occupants;

    @Column(name = "vehicles")
    private Integer vehicles;

    @Column(name = "pets")
    private Boolean pets;

    @Column(name = "requested_at")
    private Instant requestedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ViewingAppointment() {
    }

    public static ViewingAppointment create(UUID propertyId, CreateViewingRequest request) {
        ViewingAppointment appointment = new ViewingAppointment();
        appointment.propertyId = propertyId;
        appointment.roomLabel = trimToNull(request.roomLabel());
        appointment.visitorName = request.visitorName().trim();
        appointment.visitorPhone = request.visitorPhone().trim();
        appointment.note = trimToNull(request.note());
        appointment.expectedMoveIn = trimToNull(request.expectedMoveIn());
        appointment.occupants = request.occupants();
        appointment.vehicles = request.vehicles();
        appointment.pets = request.pets();
        appointment.requestedAt = request.requestedAt();
        appointment.status = AppointmentStatus.PENDING;
        return appointment;
    }

    public void changeStatus(AppointmentStatus status) {
        this.status = status;
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() { return id; }
    public UUID getPropertyId() { return propertyId; }
    public String getRoomLabel() { return roomLabel; }
    public String getVisitorName() { return visitorName; }
    public String getVisitorPhone() { return visitorPhone; }
    public String getNote() { return note; }
    public String getExpectedMoveIn() { return expectedMoveIn; }
    public Integer getOccupants() { return occupants; }
    public Integer getVehicles() { return vehicles; }
    public Boolean getPets() { return pets; }
    public Instant getRequestedAt() { return requestedAt; }
    public AppointmentStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
