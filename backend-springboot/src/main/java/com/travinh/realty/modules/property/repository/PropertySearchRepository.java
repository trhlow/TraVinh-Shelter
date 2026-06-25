package com.travinh.realty.modules.property.repository;

import com.travinh.realty.modules.property.dto.PropertySearchCriteria;
import com.travinh.realty.modules.property.model.Property;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PropertySearchRepository {
    Page<Property> search(PropertySearchCriteria criteria, Pageable pageable);
}
