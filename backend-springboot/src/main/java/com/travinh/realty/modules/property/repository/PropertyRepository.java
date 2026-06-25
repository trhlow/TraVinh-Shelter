package com.travinh.realty.modules.property.repository;

import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.model.PropertyStatus;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PropertyRepository extends JpaRepository<Property, UUID>, PropertySearchRepository {
    Page<Property> findByStatus(PropertyStatus status, Pageable pageable);
    Page<Property> findByBrokerId(UUID brokerId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Property p where p.id = :id")
    java.util.Optional<Property> findByIdForUpdate(@Param("id") UUID id);
}
