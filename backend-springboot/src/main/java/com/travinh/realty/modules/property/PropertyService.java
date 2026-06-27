package com.travinh.realty.modules.property;

import com.travinh.realty.modules.property.dto.CreatePropertyRequest;
import com.travinh.realty.modules.property.dto.PropertyResponse;
import com.travinh.realty.modules.property.dto.PropertySearchCriteria;
import com.travinh.realty.modules.property.dto.UpdatePropertyRequest;
import com.travinh.realty.modules.property.model.Category;
import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.model.PropertyStatus;
import com.travinh.realty.modules.property.repository.CategoryRepository;
import com.travinh.realty.modules.property.repository.PropertyRepository;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PropertyService {
    private static final Set<String> RESERVED_SEARCH_PARAMS = Set.of("page", "size", "sort",
            "categorySlug", "status", "minPrice", "maxPrice");
    private static final String ATTRIBUTE_PREFIX = "attr.";
    private static final String ATTRIBUTE_MIN_SUFFIX = ".min";
    private static final String ATTRIBUTE_MAX_SUFFIX = ".max";
    private static final String ATTRIBUTE_KEY_PATTERN = "^[A-Za-z0-9_.-]+$";

    private final PropertyRepository properties;
    private final CategoryRepository categories;
    private final UserRepository users;

    public PropertyService(PropertyRepository properties, CategoryRepository categories, UserRepository users) {
        this.properties = properties;
        this.categories = categories;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Page<PropertyResponse> search(MultiValueMap<String, String> params, Pageable pageable) {
        return properties.search(criteriaFrom(params), pageable).map(PropertyResponse::from);
    }

    @Transactional(readOnly = true)
    public PropertyResponse publicDetail(UUID propertyId) {
        Property property = findProperty(propertyId);
        if (property.getStatus() == PropertyStatus.HIDDEN) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found");
        }
        return PropertyResponse.from(property);
    }

    @Transactional
    public PropertyResponse create(UUID brokerId, CreatePropertyRequest request) {
        User broker = requireActiveBroker(brokerId);
        Category category = findCategory(request.categoryId(), request.categorySlug());
        Property property = Property.create(broker, category, request.title().trim(), request.address().trim(),
                request.price(), normalizeAttributes(request.attributes()));
        return PropertyResponse.from(properties.save(property));
    }

    @Transactional
    public PropertyResponse update(UUID brokerId, UUID propertyId, UpdatePropertyRequest request) {
        User broker = requireActiveBroker(brokerId);
        Property property = findOwnedProperty(propertyId, broker);
        Category category = findCategory(request.categoryId(), request.categorySlug());
        property.updateDetails(category, request.title().trim(), request.address().trim(), request.price(),
                normalizeAttributes(request.attributes()));
        return PropertyResponse.from(property);
    }

    @Transactional
    public PropertyResponse updateStatus(UUID brokerId, UUID propertyId, PropertyStatus status) {
        User broker = requireActiveBroker(brokerId);
        Property property = findOwnedProperty(propertyId, broker);
        if (status == PropertyStatus.HIDDEN) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Broker cannot hide a property");
        }
        property.changeStatus(status);
        return PropertyResponse.from(property);
    }

    private PropertySearchCriteria criteriaFrom(MultiValueMap<String, String> params) {
        Map<String, Object> equals = new LinkedHashMap<>();
        Map<String, BigDecimal> minimums = new LinkedHashMap<>();
        Map<String, BigDecimal> maximums = new LinkedHashMap<>();

        for (Map.Entry<String, java.util.List<String>> entry : params.entrySet()) {
            String key = entry.getKey();
            if (!key.startsWith(ATTRIBUTE_PREFIX)) {
                if (!RESERVED_SEARCH_PARAMS.contains(key)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported search parameter: " + key);
                }
                continue;
            }
            String attributeExpression = key.substring(ATTRIBUTE_PREFIX.length());
            String rawValue = firstValue(entry.getValue());
            if (attributeExpression.endsWith(ATTRIBUTE_MIN_SUFFIX)) {
                minimums.put(validAttributeKey(attributeExpression.substring(0,
                        attributeExpression.length() - ATTRIBUTE_MIN_SUFFIX.length())), parseDecimal(key, rawValue));
            } else if (attributeExpression.endsWith(ATTRIBUTE_MAX_SUFFIX)) {
                maximums.put(validAttributeKey(attributeExpression.substring(0,
                        attributeExpression.length() - ATTRIBUTE_MAX_SUFFIX.length())), parseDecimal(key, rawValue));
            } else {
                equals.put(validAttributeKey(attributeExpression), parseAttributeValue(rawValue));
            }
        }

        return new PropertySearchCriteria(blankToNull(params.getFirst("categorySlug")),
                parseStatus(params.getFirst("status")), parseOptionalDecimal("minPrice", params.getFirst("minPrice")),
                parseOptionalDecimal("maxPrice", params.getFirst("maxPrice")), equals, minimums, maximums);
    }

    private User requireActiveBroker(UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        if (user.getRole() != UserRole.BROKER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Broker role is required");
        }
        if (user.getPhone() == null || user.getPhone().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Broker profile requires a phone number");
        }
        return user;
    }

    private Property findOwnedProperty(UUID propertyId, User broker) {
        Property property = findProperty(propertyId);
        if (!property.getBroker().getId().equals(broker.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Property belongs to another broker");
        }
        return property;
    }

    private Property findProperty(UUID propertyId) {
        return properties.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
    }

    private Category findCategory(Long categoryId, String categorySlug) {
        if (categoryId == null && blankToNull(categorySlug) == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "categoryId or categorySlug is required");
        }
        if (categoryId != null) {
            return categories.findById(categoryId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        }
        return categories.findBySlug(categorySlug.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    }

    private Map<String, Object> normalizeAttributes(Map<String, Object> attributes) {
        if (attributes == null) {
            return new LinkedHashMap<>();
        }
        return new LinkedHashMap<>(attributes);
    }

    private String validAttributeKey(String key) {
        if (key == null || key.isBlank() || !key.matches(ATTRIBUTE_KEY_PATTERN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid attribute filter key");
        }
        return key;
    }

    private PropertyStatus parseStatus(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) {
            return null;
        }
        try {
            return PropertyStatus.valueOf(normalized.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid property status", exception);
        }
    }

    private BigDecimal parseOptionalDecimal(String name, String value) {
        String normalized = blankToNull(value);
        return normalized == null ? null : parseDecimal(name, normalized);
    }

    private BigDecimal parseDecimal(String name, String value) {
        try {
            return new BigDecimal(value.trim());
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid decimal value for " + name, exception);
        }
    }

    private Object parseAttributeValue(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attribute filter value is required");
        }
        if ("true".equalsIgnoreCase(normalized) || "false".equalsIgnoreCase(normalized)) {
            return Boolean.parseBoolean(normalized);
        }
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException ignored) {
            return normalized;
        }
    }

    private String firstValue(java.util.List<String> values) {
        if (values == null || values.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search parameter value is required");
        }
        return values.getFirst();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
