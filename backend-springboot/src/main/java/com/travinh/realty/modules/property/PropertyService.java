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
            "q", "categorySlug", "status", "minPrice", "maxPrice");
    private static final String ATTRIBUTE_PREFIX = "attr.";
    private static final String ATTRIBUTE_MIN_SUFFIX = ".min";
    private static final String ATTRIBUTE_MAX_SUFFIX = ".max";
    private static final String ATTRIBUTE_KEY_PATTERN = "^[A-Za-z0-9_.-]+$";
    private static final int MAX_ATTRIBUTE_ENTRIES = 20;
    private static final int MAX_ATTRIBUTE_VALUE_LENGTH = 10_000;

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
        return properties.search(criteriaFrom(params), pageable, false).map(PropertyResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<PropertyResponse> mine(UUID brokerId, Pageable pageable) {
        User broker = requireActiveBroker(brokerId);
        return properties.findByBrokerId(broker.getId(), pageable).map(PropertyResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<PropertyResponse> adminList(MultiValueMap<String, String> params, Pageable pageable) {
        return properties.search(criteriaFrom(params), pageable, true).map(PropertyResponse::from);
    }

    @Transactional(readOnly = true)
    public PropertyResponse publicDetail(UUID propertyId) {
        Property property = findProperty(propertyId);
        if (property.getStatus() == PropertyStatus.HIDDEN) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản");
        }
        return PropertyResponse.from(property);
    }

    @Transactional
    public PropertyResponse create(UUID brokerId, CreatePropertyRequest request) {
        User broker = requireActiveBroker(brokerId);
        Category category = findCategory(request.categoryId(), request.categorySlug());
        Map<String, Object> attributes = normalizeAttributes(request.attributes());
        requireWard(attributes);
        Property property = Property.create(broker, category, request.title().trim(), request.address().trim(),
                request.price(), attributes);
        return PropertyResponse.from(properties.save(property));
    }

    private void requireWard(Map<String, Object> attributes) {
        Object ward = attributes.get("ward");
        if (!(ward instanceof String wardValue) || wardValue.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn phường/xã");
        }
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
        property.changeStatus(status);
        return PropertyResponse.from(property);
    }

    @Transactional
    public PropertyResponse adminUpdateStatus(UUID propertyId, PropertyStatus status) {
        Property property = findProperty(propertyId);
        property.changeStatus(status);
        return PropertyResponse.from(property);
    }

    @Transactional
    public void delete(UUID brokerId, UUID propertyId) {
        User broker = requireActiveBroker(brokerId);
        Property property = findOwnedProperty(propertyId, broker);
        properties.delete(property);
    }

    private PropertySearchCriteria criteriaFrom(MultiValueMap<String, String> params) {
        Map<String, Object> equals = new LinkedHashMap<>();
        Map<String, BigDecimal> minimums = new LinkedHashMap<>();
        Map<String, BigDecimal> maximums = new LinkedHashMap<>();

        for (Map.Entry<String, java.util.List<String>> entry : params.entrySet()) {
            String key = entry.getKey();
            if (!key.startsWith(ATTRIBUTE_PREFIX)) {
                if (!RESERVED_SEARCH_PARAMS.contains(key)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tham số tìm kiếm không được hỗ trợ: " + key);
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

        return new PropertySearchCriteria(blankToNull(params.getFirst("q")), blankToNull(params.getFirst("categorySlug")),
                parseStatus(params.getFirst("status")), parseOptionalDecimal("minPrice", params.getFirst("minPrice")),
                parseOptionalDecimal("maxPrice", params.getFirst("maxPrice")), equals, minimums, maximums);
    }

    private User requireActiveBroker(UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu đăng nhập"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu đăng nhập");
        }
        if (user.getRole() != UserRole.BROKER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Yêu cầu vai trò môi giới");
        }
        if (user.getPhone() == null || user.getPhone().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Hồ sơ môi giới yêu cầu số điện thoại");
        }
        return user;
    }

    private Property findOwnedProperty(UUID propertyId, User broker) {
        Property property = findProperty(propertyId);
        if (!property.getBroker().getId().equals(broker.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản");
        }
        return property;
    }

    private Property findProperty(UUID propertyId) {
        return properties.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản"));
    }

    private Category findCategory(Long categoryId, String categorySlug) {
        if (categoryId == null && blankToNull(categorySlug) == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần cung cấp categoryId hoặc categorySlug");
        }
        if (categoryId != null) {
            return categories.findById(categoryId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục"));
        }
        return categories.findBySlug(categorySlug.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục"));
    }

    private Map<String, Object> normalizeAttributes(Map<String, Object> attributes) {
        if (attributes == null) {
            return new LinkedHashMap<>();
        }
        if (attributes.size() > MAX_ATTRIBUTE_ENTRIES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Quá nhiều thuộc tính (tối đa " + MAX_ATTRIBUTE_ENTRIES + ")");
        }
        Map<String, Object> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : attributes.entrySet()) {
            String key = validAttributeKey(entry.getKey());
            Object value = entry.getValue();
            if (value instanceof String stringValue && stringValue.length() > MAX_ATTRIBUTE_VALUE_LENGTH) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Giá trị thuộc tính quá dài cho khoá: " + key);
            }
            if (value != null && !(value instanceof String) && !(value instanceof Number) && !(value instanceof Boolean)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Giá trị thuộc tính phải là chuỗi, số hoặc boolean cho khoá: " + key);
            }
            if ("lat".equals(key) && value instanceof Number number
                    && (number.doubleValue() < -90 || number.doubleValue() > 90)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lat phải nằm trong khoảng -90 đến 90");
            }
            if ("lng".equals(key) && value instanceof Number number
                    && (number.doubleValue() < -180 || number.doubleValue() > 180)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lng phải nằm trong khoảng -180 đến 180");
            }
            normalized.put(key, value);
        }
        return normalized;
    }

    private String validAttributeKey(String key) {
        if (key == null || key.isBlank() || !key.matches(ATTRIBUTE_KEY_PATTERN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoá lọc thuộc tính không hợp lệ");
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái bất động sản không hợp lệ", exception);
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị số không hợp lệ cho " + name, exception);
        }
    }

    private Object parseAttributeValue(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị lọc thuộc tính là bắt buộc");
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị tham số tìm kiếm là bắt buộc");
        }
        return values.getFirst();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
