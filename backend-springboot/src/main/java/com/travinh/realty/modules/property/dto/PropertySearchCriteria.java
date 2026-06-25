package com.travinh.realty.modules.property.dto;

import com.travinh.realty.modules.property.model.PropertyStatus;
import java.math.BigDecimal;
import java.util.Map;

public record PropertySearchCriteria(String categorySlug, PropertyStatus status,
                                     BigDecimal minPrice, BigDecimal maxPrice,
                                     Map<String, Object> attributeEquals,
                                     Map<String, BigDecimal> attributeMinimums,
                                     Map<String, BigDecimal> attributeMaximums) {
}
