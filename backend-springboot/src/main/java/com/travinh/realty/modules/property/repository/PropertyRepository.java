package com.travinh.realty.modules.property.repository;

import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.model.PropertyStatus;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyRepository extends JpaRepository<Property, UUID> {
    Page<Property> findByStatus(PropertyStatus status, Pageable pageable);
    Page<Property> findByBrokerId(UUID brokerId, Pageable pageable);
}
