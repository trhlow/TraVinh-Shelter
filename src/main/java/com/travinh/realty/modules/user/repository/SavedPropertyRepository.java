package com.travinh.realty.modules.user.repository;

import com.travinh.realty.modules.user.model.SavedProperty;
import com.travinh.realty.modules.user.model.SavedPropertyId;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedPropertyRepository extends JpaRepository<SavedProperty, SavedPropertyId> {
    boolean existsByIdUserIdAndIdPropertyId(UUID userId, UUID propertyId);
}
