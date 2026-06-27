package com.travinh.realty.modules.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.media.dto.CreateVideoLinkRequest;
import com.travinh.realty.modules.media.model.Media;
import com.travinh.realty.modules.media.model.MediaType;
import com.travinh.realty.modules.media.repository.MediaRepository;
import com.travinh.realty.modules.property.model.Category;
import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.repository.CategoryRepository;
import com.travinh.realty.modules.property.repository.PropertyRepository;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes")
@Testcontainers(disabledWithoutDocker = true)
class MediaConcurrencyIntegrationTest {
    private static final Path STORAGE_ROOT = createStorageRoot();

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("tv_realty_media_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("app.storage.local-path", () -> STORAGE_ROOT.toString());
        registry.add("app.storage.public-url-prefix", () -> "/api/v1/media");
    }

    @Autowired private MediaService service;
    @Autowired private MediaRepository media;
    @Autowired private PropertyRepository properties;
    @Autowired private CategoryRepository categories;
    @Autowired private UserRepository users;

    @Test
    void concurrentImageUploadsCannotExceedSevenImages() throws Exception {
        Fixture fixture = fixture("images-" + UUID.randomUUID());
        int attempts = 10;

        List<Boolean> outcomes = runConcurrently(attempts, attempt -> {
            try {
                service.uploadImage(fixture.principal().id(), fixture.property().getId(),
                        new MockMultipartFile("file", "room-%d.png".formatted(attempt),
                                "image/png", ("image-" + attempt).getBytes()), false);
                return true;
            } catch (ResponseStatusException exception) {
                assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
                assertThat(exception.getReason()).isEqualTo("A property can have at most 7 images");
                return false;
            }
        });

        assertThat(outcomes).containsOnly(true, false);
        assertThat(outcomes).filteredOn(Boolean::booleanValue).hasSize(7);
        assertThat(media.countByPropertyIdAndMediaType(fixture.property().getId(), MediaType.IMAGE)).isEqualTo(7);
    }

    @Test
    void concurrentVideoFileAndVideoLinkCannotCreateMoreThanOneVideo() throws Exception {
        Fixture fixture = fixture("videos-" + UUID.randomUUID());

        List<Boolean> outcomes = runConcurrently(List.of(
                () -> {
                    try {
                        service.uploadVideoFile(fixture.principal().id(), fixture.property().getId(),
                                new MockMultipartFile("file", "tour.mp4", "video/mp4", "video".getBytes()));
                        return true;
                    } catch (ResponseStatusException exception) {
                        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
                        return false;
                    }
                },
                () -> {
                    try {
                        service.addVideoLink(fixture.principal().id(), fixture.property().getId(),
                                new CreateVideoLinkRequest("https://example.com/video/" + UUID.randomUUID()));
                        return true;
                    } catch (ResponseStatusException exception) {
                        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
                        return false;
                    }
                }));

        assertThat(outcomes).containsExactlyInAnyOrder(true, false);
        assertThat(media.findByPropertyIdOrderByUploadedAtAsc(fixture.property().getId()))
                .filteredOn(item -> item.getMediaType() == MediaType.VIDEO_FILE
                        || item.getMediaType() == MediaType.VIDEO_LINK)
                .hasSize(1);
    }

    @Test
    void databaseUniqueIndexRejectsSecondVideoForSameProperty() {
        Fixture fixture = fixture("video-index-" + UUID.randomUUID());
        media.saveAndFlush(Media.create(fixture.property(), MediaType.VIDEO_LINK, "https://example.com/one", false));

        assertThatThrownBy(() -> media.saveAndFlush(Media.create(fixture.property(),
                MediaType.VIDEO_FILE, "/api/v1/media/properties/" + fixture.property().getId() + "/tour.mp4", false)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Fixture fixture(String username) {
        User broker = users.saveAndFlush(User.createBroker(username, username + "@example.com",
                "hash", "Broker", "0900000000"));
        Category category = categories.findBySlug("tro").orElseThrow();
        Property property = properties.saveAndFlush(Property.create(broker, category, "Tin", "Trà Vinh",
                BigDecimal.valueOf(1_500_000), Map.of()));
        return new Fixture(UserPrincipal.from(broker), property);
    }

    private List<Boolean> runConcurrently(int attempts, ThrowingAttempt attempt) throws Exception {
        List<Callable<Boolean>> tasks = IntStream.range(0, attempts)
                .mapToObj(index -> (Callable<Boolean>) () -> attempt.run(index))
                .toList();
        return runConcurrently(tasks);
    }

    private List<Boolean> runConcurrently(List<Callable<Boolean>> tasks) throws Exception {
        var executor = Executors.newFixedThreadPool(tasks.size());
        CountDownLatch ready = new CountDownLatch(tasks.size());
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Callable<Boolean>> gatedTasks = tasks.stream()
                    .map(task -> (Callable<Boolean>) () -> {
                        ready.countDown();
                        start.await(5, TimeUnit.SECONDS);
                        return task.call();
                    })
                    .toList();
            var futures = gatedTasks.stream().map(executor::submit).toList();
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            return futures.stream().map(future -> {
                try {
                    return future.get(20, TimeUnit.SECONDS);
                } catch (Exception exception) {
                    throw new IllegalStateException(exception);
                }
            }).toList();
        } finally {
            executor.shutdownNow();
        }
    }

    private static Path createStorageRoot() {
        try {
            return Files.createTempDirectory("travinh-media-it-");
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private record Fixture(UserPrincipal principal, Property property) {
    }

    @FunctionalInterface
    private interface ThrowingAttempt {
        boolean run(int attempt) throws Exception;
    }
}
