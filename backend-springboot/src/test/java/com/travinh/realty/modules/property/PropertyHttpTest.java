package com.travinh.realty.modules.property;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.common.config.SecurityConfig;
import com.travinh.realty.common.exception.GlobalExceptionHandler;
import com.travinh.realty.modules.admin.AdminPropertyController;
import com.travinh.realty.modules.auth.security.JpaUserDetailsService;
import com.travinh.realty.modules.auth.security.JwtAuthenticationFilter;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.property.dto.PropertySearchCriteria;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {PropertyController.class, CategoryController.class, AdminPropertyController.class})
@Import({SecurityConfig.class, JwtService.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class,
        PropertyService.class, CategoryService.class, PropertyHttpTest.JwtTestConfiguration.class})
class PropertyHttpTest {
    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockBean private PropertyRepository properties;
    @MockBean private CategoryRepository categories;
    @MockBean private UserRepository users;
    @MockBean private JpaUserDetailsService userDetailsService;
    @MockBean private JpaMetamodelMappingContext jpaMappingContext;

    @Test
    void publicSearchParsesJsonbAttributeFiltersAndReturnsBrokerContact() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Category category = category(1L, "Trọ", "tro");
        Property property = property(broker, category, "Phòng trọ", PropertyStatus.AVAILABLE,
                Map.of("area", 30, "rooms", 1, "has_ac", true));
        when(properties.search(any(PropertySearchCriteria.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(property), PageRequest.of(0, 20), 42));

        mockMvc.perform(get("/properties")
                        .param("categorySlug", "tro")
                        .param("minPrice", "1000000")
                        .param("maxPrice", "3000000")
                        .param("attr.area.min", "25")
                        .param("attr.area.max", "35")
                        .param("attr.rooms", "1")
                        .param("attr.has_ac", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Phòng trọ"))
                .andExpect(jsonPath("$.content[0].broker.phone").value("0900000000"))
                .andExpect(jsonPath("$.content[0].attributes.area").value(30))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(42))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(false))
                .andExpect(jsonPath("$.pageable").doesNotExist())
                .andExpect(jsonPath("$.sort").doesNotExist());

        ArgumentCaptor<PropertySearchCriteria> criteria = ArgumentCaptor.forClass(PropertySearchCriteria.class);
        org.mockito.Mockito.verify(properties).search(criteria.capture(), any(Pageable.class));
        assertThat(criteria.getValue().categorySlug()).isEqualTo("tro");
        assertThat(criteria.getValue().status()).isNull();
        assertThat(criteria.getValue().minPrice()).isEqualByComparingTo("1000000");
        assertThat(criteria.getValue().maxPrice()).isEqualByComparingTo("3000000");
        assertThat(criteria.getValue().attributeEquals()).containsEntry("has_ac", true);
        assertThat(criteria.getValue().attributeEquals().get("rooms")).isEqualTo(new BigDecimal("1"));
        assertThat(criteria.getValue().attributeMinimums()).containsEntry("area", new BigDecimal("25"));
        assertThat(criteria.getValue().attributeMaximums()).containsEntry("area", new BigDecimal("35"));
    }

    @Test
    void brokerCreatesAvailablePropertyAndUserCannotCreate() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        User lockedBroker = user("locked@example.com", UserRole.BROKER, UserStatus.LOCKED, "Locked", "0900000000");
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Category category = category(1L, "Trọ", "tro");
        String payload = """
                {"categorySlug":"tro","title":"Phòng trọ sạch","address":"Trà Vinh",
                 "price":1500000,"attributes":{"area":30,"rooms":1,"has_ac":true}}
                """;

        mockMvc.perform(post("/properties").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401));

        authenticate(user);
        mockMvc.perform(post("/properties").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        authenticate(admin);
        mockMvc.perform(post("/properties").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        authenticate(lockedBroker);
        mockMvc.perform(post("/properties").header("Authorization", bearer(lockedBroker))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(categories.findBySlug("tro")).thenReturn(Optional.of(category));
        when(properties.save(any(Property.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/properties").header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.broker.phone").value("0900000000"))
                .andExpect(jsonPath("$.attributes.has_ac").value(true));

        ArgumentCaptor<Property> saved = ArgumentCaptor.forClass(Property.class);
        org.mockito.Mockito.verify(properties).save(saved.capture());
        assertThat(saved.getValue().getBroker().getId()).isEqualTo(broker.getId());
        assertThat(saved.getValue().getStatus()).isEqualTo(PropertyStatus.AVAILABLE);
        assertThat(saved.getValue().getAttributes()).containsEntry("rooms", 1);
    }

    @Test
    void invalidAttributeFilterKeyIsRejectedBeforeRepositorySearch() throws Exception {
        mockMvc.perform(get("/properties").param("attr.area);drop table properties;--", "30"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void brokerNeedsPhoneAndCannotOperateOnAnotherBrokerProperty() throws Exception {
        User brokerWithoutPhone = user("nop@example.com", UserRole.BROKER, UserStatus.ACTIVE, "No Phone", null);
        authenticate(brokerWithoutPhone);
        when(users.findById(brokerWithoutPhone.getId())).thenReturn(Optional.of(brokerWithoutPhone));

        mockMvc.perform(post("/properties").header("Authorization", bearer(brokerWithoutPhone))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"categorySlug":"tro","title":"Tin","address":"Trà Vinh","price":1,"attributes":{}}
                        """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422));

        User owner = user("owner@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Owner", "0900000000");
        User other = user("other@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Other", "0911111111");
        Property property = property(owner, category(1L, "Trọ", "tro"), "Tin", PropertyStatus.AVAILABLE, Map.of());
        authenticate(other);
        when(users.findById(other.getId())).thenReturn(Optional.of(other));
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));

        mockMvc.perform(patch("/properties/{id}/status", property.getId()).header("Authorization", bearer(other))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RENTED\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void ownerCanUpdateStatusCanSelfHideAndHiddenDetailIsNotPublic() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, category(1L, "Trọ", "tro"), "Tin", PropertyStatus.AVAILABLE, Map.of());
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));

        mockMvc.perform(patch("/properties/{id}/status", property.getId()).header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RENTED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RENTED"));
        assertThat(property.getStatus()).isEqualTo(PropertyStatus.RENTED);

        mockMvc.perform(patch("/properties/{id}/status", property.getId()).header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"HIDDEN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HIDDEN"));

        Property hidden = property(broker, category(1L, "Trọ", "tro"), "Ẩn", PropertyStatus.HIDDEN, Map.of());
        when(properties.findById(hidden.getId())).thenReturn(Optional.of(hidden));
        mockMvc.perform(get("/properties/{id}", hidden.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void categoriesEndpointIsPublic() throws Exception {
        when(categories.findAll()).thenReturn(List.of(category(1L, "Trọ", "tro"), category(2L, "Nhà", "nha")));

        mockMvc.perform(get("/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("tro"))
                .andExpect(jsonPath("$[1].slug").value("nha"));
    }

    @Test
    void adminCanHideAnyPropertyThroughAdminEndpoint() throws Exception {
        User owner = user("owner@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Owner", "0900000000");
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "02943999888");
        Property property = property(owner, category(1L, "Trọ", "tro"), "Tin", PropertyStatus.AVAILABLE, Map.of());
        authenticate(admin);
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));

        mockMvc.perform(patch("/admin/properties/{id}/status", property.getId()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"HIDDEN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HIDDEN"));
        assertThat(property.getStatus()).isEqualTo(PropertyStatus.HIDDEN);
    }

    private void authenticate(User user) {
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenAnswer(invocation -> UserPrincipal.from(user));
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private User user(String email, UserRole role, UserStatus status, String fullName, String phone) {
        User user = role == UserRole.BROKER
                ? User.createBroker(email.substring(0, email.indexOf('@')), email, "hash", fullName, phone)
                : User.register(email.substring(0, email.indexOf('@')), email, "hash", fullName, phone);
        if (role == UserRole.ADMIN) {
            ReflectionTestUtils.setField(user, "role", UserRole.ADMIN);
        }
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "status", status);
        return user;
    }

    private Category category(Long id, String name, String slug) {
        Category category = newCategory();
        ReflectionTestUtils.setField(category, "id", id);
        ReflectionTestUtils.setField(category, "name", name);
        ReflectionTestUtils.setField(category, "slug", slug);
        ReflectionTestUtils.setField(category, "description", name);
        return category;
    }

    private Category newCategory() {
        try {
            java.lang.reflect.Constructor<Category> constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private Property property(User broker, Category category, String title, PropertyStatus status,
                              Map<String, Object> attributes) {
        Property property = Property.create(broker, category, title, "Trà Vinh", BigDecimal.valueOf(1_500_000),
                new LinkedHashMap<>(attributes));
        property.changeStatus(status);
        ReflectionTestUtils.setField(property, "id", UUID.randomUUID());
        return property;
    }

    @TestConfiguration
    static class JwtTestConfiguration {
        @Bean
        JwtProperties jwtProperties() {
            return new JwtProperties(SECRET, 60_000);
        }
    }
}
