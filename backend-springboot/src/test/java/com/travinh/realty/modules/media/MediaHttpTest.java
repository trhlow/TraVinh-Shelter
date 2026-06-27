package com.travinh.realty.modules.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.common.config.SecurityConfig;
import com.travinh.realty.common.config.StaticMediaConfig;
import com.travinh.realty.common.exception.GlobalExceptionHandler;
import com.travinh.realty.infrastructure.storage.LocalMediaStorage;
import com.travinh.realty.infrastructure.storage.StorageProperties;
import com.travinh.realty.modules.auth.security.JpaUserDetailsService;
import com.travinh.realty.modules.auth.security.JwtAuthenticationFilter;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.media.model.Media;
import com.travinh.realty.modules.media.model.MediaType;
import com.travinh.realty.modules.media.repository.MediaRepository;
import com.travinh.realty.modules.property.model.Category;
import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.model.PropertyStatus;
import com.travinh.realty.modules.property.repository.PropertyRepository;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import com.travinh.realty.modules.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
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
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = MediaController.class)
@Import({SecurityConfig.class, JwtService.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class,
        MediaService.class, LocalMediaStorage.class, StaticMediaConfig.class,
        MediaHttpTest.JwtAndStorageTestConfiguration.class})
class MediaHttpTest {
    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private StorageProperties storageProperties;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private MediaRepository media;
    @MockBean private PropertyRepository properties;
    @MockBean private UserRepository users;
    @MockBean private JpaUserDetailsService userDetailsService;
    @MockBean private JpaMetamodelMappingContext jpaMappingContext;

    @Test
    void publicListReturnsMediaForVisiblePropertyAnd404ForHiddenProperty() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property visible = property(broker, PropertyStatus.AVAILABLE);
        Media image = media(visible, MediaType.IMAGE, storageProperties.publicUrlPrefix() + "/properties/" + visible.getId() + "/one.jpg", true);
        when(properties.findById(visible.getId())).thenReturn(Optional.of(visible));
        when(media.findByPropertyIdOrderByUploadedAtAsc(visible.getId())).thenReturn(List.of(image));

        mockMvc.perform(get("/properties/{propertyId}/media", visible.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].mediaType").value("IMAGE"))
                .andExpect(jsonPath("$[0].thumbnail").value(true))
                .andExpect(jsonPath("$[0].url").value(image.getUrl()));

        Property hidden = property(broker, PropertyStatus.HIDDEN);
        when(properties.findById(hidden.getId())).thenReturn(Optional.of(hidden));
        mockMvc.perform(get("/properties/{propertyId}/media", hidden.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void brokerUploadsImageToLocalStorageAndPersistsUrl() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(media.countByPropertyIdAndMediaType(property.getId(), MediaType.IMAGE)).thenReturn(0L);
        when(media.saveAndFlush(any(Media.class))).thenAnswer(invocation -> {
            Media saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
            return saved;
        });

        MockMultipartFile file = new MockMultipartFile("file", "room.png", "image/png", "fake-png".getBytes());
        var result = mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId())
                        .file(file)
                        .param("thumbnail", "true")
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mediaType").value("IMAGE"))
                .andExpect(jsonPath("$.thumbnail").value(true))
                .andExpect(jsonPath("$.url", startsWith(storageProperties.publicUrlPrefix() + "/properties/" + property.getId() + "/")))
                .andReturn();

        ArgumentCaptor<Media> saved = ArgumentCaptor.forClass(Media.class);
        verify(media).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getMediaType()).isEqualTo(MediaType.IMAGE);
        assertThat(saved.getValue().isThumbnail()).isTrue();
        assertThat(savedFile(saved.getValue().getUrl())).exists().hasContent("fake-png");

        String publicUrl = responseBody(result).get("url").toString();
        mockMvc.perform(get(publicUrl).contextPath("/api/v1"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(org.springframework.http.MediaType.IMAGE_PNG))
                .andExpect(content().bytes("fake-png".getBytes()));
    }

    @Test
    void uploadImageEnforcesRoleOwnershipPhoneLimitAndContentType() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        User lockedBroker = user("locked@example.com", UserRole.BROKER, UserStatus.LOCKED, "Locked", "0900000000");
        User brokerWithoutPhone = user("nop@example.com", UserRole.BROKER, UserStatus.ACTIVE, "No Phone", null);
        User owner = user("owner@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Owner", "0900000000");
        User otherBroker = user("other@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Other", "0911111111");
        Property property = property(owner, PropertyStatus.AVAILABLE);
        MockMultipartFile file = new MockMultipartFile("file", "room.jpg", "image/jpeg", "jpg".getBytes());

        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(file))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(org.springframework.http.MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401));

        authenticate(user);
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(file)
                        .header("Authorization", bearer(user)))
                .andExpect(status().isForbidden());

        authenticate(admin);
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(file)
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isForbidden());

        authenticate(lockedBroker);
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(file)
                        .header("Authorization", bearer(lockedBroker)))
                .andExpect(status().isUnauthorized());

        authenticate(brokerWithoutPhone);
        when(users.findById(brokerWithoutPhone.getId())).thenReturn(Optional.of(brokerWithoutPhone));
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(file)
                        .header("Authorization", bearer(brokerWithoutPhone)))
                .andExpect(status().isUnprocessableEntity());

        authenticate(otherBroker);
        when(users.findById(otherBroker.getId())).thenReturn(Optional.of(otherBroker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(file)
                        .header("Authorization", bearer(otherBroker)))
                .andExpect(status().isForbidden());

        authenticate(owner);
        when(users.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(media.countByPropertyIdAndMediaType(property.getId(), MediaType.IMAGE)).thenReturn(7L);
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(file)
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("A property can have at most 7 images"));

        when(media.countByPropertyIdAndMediaType(property.getId(), MediaType.IMAGE)).thenReturn(0L);
        MockMultipartFile text = new MockMultipartFile("file", "note.txt", "text/plain", "nope".getBytes());
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(text)
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isUnsupportedMediaType());

        MockMultipartFile activeContent = new MockMultipartFile("file", "room.png", "image/png",
                "<script>alert(1)</script>".getBytes());
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(activeContent)
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.message").value("Media content does not match allowed upload types"));
    }

    @Test
    void videoLinkAndVideoFileAllowOnlyOneVideo() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(media.existsByPropertyIdAndMediaTypeIn(any(), any())).thenReturn(false);
        when(media.saveAndFlush(any(Media.class))).thenAnswer(invocation -> {
            Media saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
            return saved;
        });

        mockMvc.perform(post("/properties/{propertyId}/media/video-link", property.getId())
                        .header("Authorization", bearer(broker))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://example.com/video/123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mediaType").value("VIDEO_LINK"))
                .andExpect(jsonPath("$.url").value("https://example.com/video/123"));

        mockMvc.perform(post("/properties/{propertyId}/media/video-link", property.getId())
                        .header("Authorization", bearer(broker))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"javascript:alert(1)\"}"))
                .andExpect(status().isBadRequest());

        when(media.existsByPropertyIdAndMediaTypeIn(any(), any())).thenReturn(true);
        MockMultipartFile video = new MockMultipartFile("file", "tour.mp4", "video/mp4", "video".getBytes());
        mockMvc.perform(multipart("/properties/{propertyId}/media/video-file", property.getId()).file(video)
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("A property can have at most one video"));
    }

    @Test
    void brokerUploadsVideoFileAndThenVideoLinkIsRejected() throws Exception {
        User broker = user("broker-video@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(media.existsByPropertyIdAndMediaTypeIn(any(), any())).thenReturn(false, true);
        when(media.saveAndFlush(any(Media.class))).thenAnswer(invocation -> {
            Media saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
            return saved;
        });

        MockMultipartFile video = new MockMultipartFile("file", "tour.mp4", "video/mp4", "video".getBytes());
        mockMvc.perform(multipart("/properties/{propertyId}/media/video-file", property.getId()).file(video)
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mediaType").value("VIDEO_FILE"))
                .andExpect(jsonPath("$.url", startsWith(storageProperties.publicUrlPrefix() + "/properties/" + property.getId() + "/")));

        mockMvc.perform(post("/properties/{propertyId}/media/video-link", property.getId())
                        .header("Authorization", bearer(broker))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://example.com/video/after-file\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("A property can have at most one video"));
    }

    @Test
    void missingPropertyReturns404ForMediaOperations() throws Exception {
        User broker = user("missing-property@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        UUID missingPropertyId = UUID.randomUUID();
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findById(missingPropertyId)).thenReturn(Optional.empty());
        when(properties.findByIdForUpdate(missingPropertyId)).thenReturn(Optional.empty());
        MockMultipartFile image = new MockMultipartFile("file", "room.png", "image/png", "png".getBytes());
        MockMultipartFile video = new MockMultipartFile("file", "tour.mp4", "video/mp4", "video".getBytes());

        mockMvc.perform(get("/properties/{propertyId}/media", missingPropertyId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", missingPropertyId).file(image)
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        mockMvc.perform(multipart("/properties/{propertyId}/media/video-file", missingPropertyId).file(video)
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        mockMvc.perform(post("/properties/{propertyId}/media/video-link", missingPropertyId)
                        .header("Authorization", bearer(broker))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://example.com/video\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        mockMvc.perform(delete("/properties/{propertyId}/media/{mediaId}", missingPropertyId, UUID.randomUUID())
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void emptyFileIsRejected() throws Exception {
        User broker = user("empty-file@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(media.countByPropertyIdAndMediaType(property.getId(), MediaType.IMAGE)).thenReturn(0L);

        MockMultipartFile empty = new MockMultipartFile("file", "room.png", "image/png", new byte[0]);
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(empty)
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Media file is required"));
    }

    @Test
    void saveFailureAfterFileWriteCleansUpStoredFile() throws Exception {
        deleteStorageFiles();
        User broker = user("cleanup@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(media.countByPropertyIdAndMediaType(property.getId(), MediaType.IMAGE)).thenReturn(0L);
        when(media.saveAndFlush(any(Media.class))).thenThrow(new org.springframework.dao.DataIntegrityViolationException("db failed"));

        MockMultipartFile file = new MockMultipartFile("file", "room.png", "image/png", "will-clean".getBytes());
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(file)
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500));

        assertThat(storedFiles()).isEmpty();
    }

    @Test
    void ownerDeletesMediaAndLocalFile() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));

        Path directory = Path.of(storageProperties.localPath()).resolve("properties").resolve(property.getId().toString());
        Files.createDirectories(directory);
        Path stored = directory.resolve("delete-me.jpg");
        Files.writeString(stored, "bye");
        Media existing = media(property, MediaType.IMAGE, storageProperties.publicUrlPrefix() + "/properties/" + property.getId() + "/delete-me.jpg", false);
        when(media.findByIdAndPropertyId(existing.getId(), property.getId())).thenReturn(Optional.of(existing));

        mockMvc.perform(delete("/properties/{propertyId}/media/{mediaId}", property.getId(), existing.getId())
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isNoContent());

        verify(media).delete(existing);
        assertThat(stored).doesNotExist();
    }

    @Test
    void deletingMediaFromAnotherPropertyReturns404AndDoesNotDeleteFile() throws Exception {
        User broker = user("wrong-delete@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        Property otherProperty = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        Path directory = Path.of(storageProperties.localPath()).resolve("properties").resolve(otherProperty.getId().toString());
        Files.createDirectories(directory);
        Path otherFile = directory.resolve("other.jpg");
        Files.writeString(otherFile, "keep");
        Media otherMedia = media(otherProperty, MediaType.IMAGE,
                storageProperties.publicUrlPrefix() + "/properties/" + otherProperty.getId() + "/other.jpg", false);
        when(media.findByIdAndPropertyId(otherMedia.getId(), property.getId())).thenReturn(Optional.empty());

        mockMvc.perform(delete("/properties/{propertyId}/media/{mediaId}", property.getId(), otherMedia.getId())
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        verify(media, never()).delete(any(Media.class));
        assertThat(otherFile).exists().hasContent("keep");
    }

    private Path savedFile(String url) {
        String prefix = storageProperties.publicUrlPrefix() + "/";
        return Path.of(storageProperties.localPath()).resolve(url.substring(prefix.length()));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> responseBody(org.springframework.test.web.servlet.MvcResult result) throws java.io.IOException {
        return objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private List<Path> storedFiles() throws java.io.IOException {
        Path root = Path.of(storageProperties.localPath());
        if (!Files.exists(root)) {
            return List.of();
        }
        try (var paths = Files.walk(root)) {
            return paths.filter(Files::isRegularFile).toList();
        }
    }

    private void deleteStorageFiles() throws java.io.IOException {
        Path root = Path.of(storageProperties.localPath());
        if (!Files.exists(root)) {
            return;
        }
        try (var paths = Files.walk(root)) {
            for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
                if (!path.equals(root)) {
                    Files.deleteIfExists(path);
                }
            }
        }
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

    private Property property(User broker, PropertyStatus status) {
        Category category = category();
        Property property = Property.create(broker, category, "Tin", "Trà Vinh", BigDecimal.valueOf(1_500_000), Map.of());
        property.changeStatus(status);
        ReflectionTestUtils.setField(property, "id", UUID.randomUUID());
        return property;
    }

    private Media media(Property property, MediaType mediaType, String url, boolean thumbnail) {
        Media media = Media.create(property, mediaType, url, thumbnail);
        ReflectionTestUtils.setField(media, "id", UUID.randomUUID());
        return media;
    }

    private Category category() {
        try {
            java.lang.reflect.Constructor<Category> constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Category category = constructor.newInstance();
            ReflectionTestUtils.setField(category, "id", 1L);
            ReflectionTestUtils.setField(category, "name", "Trọ");
            ReflectionTestUtils.setField(category, "slug", "tro");
            return category;
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }

    @TestConfiguration
    static class JwtAndStorageTestConfiguration {
        @Bean
        JwtProperties jwtProperties() {
            return new JwtProperties(SECRET, 60_000);
        }

        @Bean
        StorageProperties storageProperties() throws java.io.IOException {
            return new StorageProperties(Files.createTempDirectory("travinh-media-test-").toString(), "/api/v1/media");
        }
    }
}
