package com.travinh.realty.modules.property.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.travinh.realty.modules.property.dto.PropertySearchCriteria;
import com.travinh.realty.modules.property.model.Property;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

@Repository
public class PropertySearchRepositoryImpl implements PropertySearchRepository {
    private static final String NUMERIC_JSON_VALUE = "^-?[0-9]+(\\.[0-9]+)?$";

    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    public PropertySearchRepositoryImpl(EntityManager entityManager, ObjectMapper objectMapper) {
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
    }

    @Override
    public Page<Property> search(PropertySearchCriteria criteria, Pageable pageable) {
        QueryParts parts = buildWhere(criteria);
        String orderBy = " ORDER BY p.created_at DESC, p.id DESC";
        Query content = entityManager.createNativeQuery("""
                SELECT p.*
                FROM properties p
                JOIN categories c ON c.id = p.category_id
                """ + parts.where() + orderBy + " LIMIT :limit OFFSET :offset", Property.class);
        Query count = entityManager.createNativeQuery("""
                SELECT COUNT(*)
                FROM properties p
                JOIN categories c ON c.id = p.category_id
                """ + parts.where());

        parts.parameters().forEach((name, value) -> {
            content.setParameter(name, value);
            count.setParameter(name, value);
        });
        content.setParameter("limit", pageable.getPageSize());
        content.setParameter("offset", pageable.getOffset());

        @SuppressWarnings("unchecked")
        List<Property> properties = content.getResultList();
        Number total = (Number) count.getSingleResult();
        return new PageImpl<>(fetchListAssociations(properties), pageable, total.longValue());
    }

    private List<Property> fetchListAssociations(List<Property> properties) {
        if (properties.isEmpty()) {
            return properties;
        }
        List<UUID> ids = properties.stream().map(Property::getId).toList();
        List<Property> hydrated = entityManager.createQuery("""
                SELECT DISTINCT p
                FROM Property p
                JOIN FETCH p.category
                JOIN FETCH p.broker
                WHERE p.id IN :ids
                """, Property.class)
                .setParameter("ids", ids)
                .getResultList();
        Map<UUID, Property> byId = new LinkedHashMap<>();
        hydrated.forEach(property -> byId.put(property.getId(), property));
        return ids.stream().map(byId::get).toList();
    }

    private QueryParts buildWhere(PropertySearchCriteria criteria) {
        List<String> predicates = new ArrayList<>();
        Map<String, Object> parameters = new LinkedHashMap<>();

        if (criteria.status() == null) {
            predicates.add("p.status = CAST('AVAILABLE' AS property_status)");
        } else {
            predicates.add("p.status = CAST(:status AS property_status)");
            parameters.put("status", criteria.status().name());
        }
        predicates.add("p.status <> CAST('HIDDEN' AS property_status)");

        if (criteria.categorySlug() != null) {
            predicates.add("c.slug = :categorySlug");
            parameters.put("categorySlug", criteria.categorySlug());
        }
        if (criteria.query() != null) {
            predicates.add("(LOWER(p.title) LIKE :query OR LOWER(p.address) LIKE :query)");
            parameters.put("query", "%" + criteria.query().trim().toLowerCase() + "%");
        }
        if (criteria.minPrice() != null) {
            predicates.add("p.price >= :minPrice");
            parameters.put("minPrice", criteria.minPrice());
        }
        if (criteria.maxPrice() != null) {
            predicates.add("p.price <= :maxPrice");
            parameters.put("maxPrice", criteria.maxPrice());
        }

        int index = 0;
        for (Map.Entry<String, Object> entry : criteria.attributeEquals().entrySet()) {
            String name = "attrEquals" + index++;
            predicates.add("p.attributes @> CAST(:" + name + " AS jsonb)");
            parameters.put(name, jsonObject(entry.getKey(), entry.getValue()));
        }
        index = 0;
        for (Map.Entry<String, BigDecimal> entry : criteria.attributeMinimums().entrySet()) {
            String key = "attrMinKey" + index;
            String value = "attrMinValue" + index++;
            predicates.add("(CASE WHEN (p.attributes ->> :" + key + ") ~ '" + NUMERIC_JSON_VALUE
                    + "' THEN (p.attributes ->> :" + key + ")::numeric >= :" + value + " ELSE FALSE END)");
            parameters.put(key, entry.getKey());
            parameters.put(value, entry.getValue());
        }
        index = 0;
        for (Map.Entry<String, BigDecimal> entry : criteria.attributeMaximums().entrySet()) {
            String key = "attrMaxKey" + index;
            String value = "attrMaxValue" + index++;
            predicates.add("(CASE WHEN (p.attributes ->> :" + key + ") ~ '" + NUMERIC_JSON_VALUE
                    + "' THEN (p.attributes ->> :" + key + ")::numeric <= :" + value + " ELSE FALSE END)");
            parameters.put(key, entry.getKey());
            parameters.put(value, entry.getValue());
        }

        return new QueryParts(" WHERE " + String.join(" AND ", predicates), parameters);
    }

    private String jsonObject(String key, Object value) {
        try {
            return objectMapper.writeValueAsString(Map.of(key, value));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Invalid JSON attribute filter", exception);
        }
    }

    private record QueryParts(String where, Map<String, Object> parameters) {
    }
}
