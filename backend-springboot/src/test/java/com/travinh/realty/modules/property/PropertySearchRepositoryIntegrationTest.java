package com.travinh.realty.modules.property;

import static org.assertj.core.api.Assertions.assertThat;

import com.travinh.realty.modules.property.dto.PropertySearchCriteria;
import com.travinh.realty.modules.property.model.Category;
import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.model.PropertyStatus;
import com.travinh.realty.modules.property.repository.CategoryRepository;
import com.travinh.realty.modules.property.repository.PropertyRepository;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes")
@Testcontainers(disabledWithoutDocker = true)
class PropertySearchRepositoryIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("tv_realty_property_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired private UserRepository users;
    @Autowired private CategoryRepository categories;
    @Autowired private PropertyRepository properties;

    @Test
    void searchesAvailablePropertiesWithPostgresJsonbAttributeFilters() {
        User broker = users.save(User.createBroker("jsonb.broker", "jsonb.broker@example.com",
                "hash", "JSONB Broker", "0900000000"));
        Category tro = categories.findBySlug("tro").orElseThrow();
        Category nha = categories.findBySlug("nha").orElseThrow();

        Property matching = properties.save(Property.create(broker, tro, "Phòng đúng filter", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), attributes(30, 1, true, "normal")));
        properties.save(Property.create(broker, tro, "Không có máy lạnh", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), attributes(30, 1, false, "normal")));
        properties.save(Property.create(broker, nha, "Sai danh mục", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), attributes(30, 1, true, "normal")));
        Property rented = Property.create(broker, tro, "Đã thuê", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), attributes(30, 1, true, "normal"));
        rented.changeStatus(PropertyStatus.RENTED);
        properties.save(rented);
        Property hidden = Property.create(broker, tro, "Tin ẩn", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), attributes(30, 1, true, "normal"));
        hidden.changeStatus(PropertyStatus.HIDDEN);
        properties.save(hidden);
        properties.save(Property.create(broker, tro, "Area không phải số", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), attributes("large", 1, true, "normal")));
        properties.save(Property.create(broker, tro, "SQL-like note không khớp", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), attributes(30, 1, true, "x' OR true --")));

        PropertySearchCriteria criteria = new PropertySearchCriteria("tro", null,
                BigDecimal.valueOf(1_000_000), BigDecimal.valueOf(2_000_000),
                Map.of("has_ac", true, "rooms", BigDecimal.ONE, "note", "normal"),
                Map.of("area", BigDecimal.valueOf(25)),
                Map.of("area", BigDecimal.valueOf(35)));

        Page<Property> result = properties.search(criteria, PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).extracting(Property::getId).containsExactly(matching.getId());
        assertThat(result.getContent().getFirst().getAttributes()).containsEntry("has_ac", true);
    }

    private Map<String, Object> attributes(Object area, int rooms, boolean hasAc, String note) {
        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put("area", area);
        attributes.put("rooms", rooms);
        attributes.put("has_ac", hasAc);
        attributes.put("note", note);
        return attributes;
    }
}
