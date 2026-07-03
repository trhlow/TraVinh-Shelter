package com.travinh.realty.modules.booking.repository;

import com.travinh.realty.modules.booking.model.ViewingAppointment;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ViewingAppointmentRepository
        extends JpaRepository<ViewingAppointment, UUID>, JpaSpecificationExecutor<ViewingAppointment> {
    List<ViewingAppointment> findByPropertyIdInOrderByCreatedAtDesc(Collection<UUID> propertyIds);
}
