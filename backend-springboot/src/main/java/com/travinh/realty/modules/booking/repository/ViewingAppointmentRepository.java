package com.travinh.realty.modules.booking.repository;

import com.travinh.realty.modules.booking.model.ViewingAppointment;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ViewingAppointmentRepository extends JpaRepository<ViewingAppointment, UUID> {
    List<ViewingAppointment> findByPropertyIdInOrderByCreatedAtDesc(Collection<UUID> propertyIds);
    List<ViewingAppointment> findAllByOrderByCreatedAtDesc();
}
