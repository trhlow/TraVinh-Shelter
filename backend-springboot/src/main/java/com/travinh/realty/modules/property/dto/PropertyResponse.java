package com.travinh.realty.modules.property.dto;

import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.model.PropertyStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record PropertyResponse(UUID id, CategoryResponse category, BrokerSummaryResponse broker,
                               String title, String address, BigDecimal price, PropertyStatus status,
                               Map<String, Object> attributes, Instant createdAt, Instant updatedAt) {
    public static PropertyResponse from(Property property) {
        return new PropertyResponse(property.getId(), CategoryResponse.from(property.getCategory()),
                BrokerSummaryResponse.from(property.getBroker()), property.getTitle(), property.getAddress(),
                property.getPrice(), property.getStatus(), property.getAttributes(),
                property.getCreatedAt(), property.getUpdatedAt());
    }
}
