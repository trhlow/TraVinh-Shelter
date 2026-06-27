package com.travinh.realty.modules.media;

import com.travinh.realty.infrastructure.storage.LocalMediaStorage;
import com.travinh.realty.modules.media.dto.CreateVideoLinkRequest;
import com.travinh.realty.modules.media.dto.MediaResponse;
import com.travinh.realty.modules.media.model.Media;
import com.travinh.realty.modules.media.model.MediaType;
import com.travinh.realty.modules.media.repository.MediaRepository;
import com.travinh.realty.modules.property.model.Property;
import com.travinh.realty.modules.property.model.PropertyStatus;
import com.travinh.realty.modules.property.repository.PropertyRepository;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MediaService {
    private static final int MAX_IMAGES_PER_PROPERTY = 7;
    private static final Set<MediaType> VIDEO_TYPES = Set.of(MediaType.VIDEO_LINK, MediaType.VIDEO_FILE);

    private final MediaRepository media;
    private final PropertyRepository properties;
    private final UserRepository users;
    private final LocalMediaStorage storage;

    public MediaService(MediaRepository media, PropertyRepository properties,
                        UserRepository users, LocalMediaStorage storage) {
        this.media = media;
        this.properties = properties;
        this.users = users;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public List<MediaResponse> listPublic(UUID propertyId) {
        Property property = findPublicProperty(propertyId);
        return media.findByPropertyIdOrderByUploadedAtAsc(property.getId()).stream()
                .map(MediaResponse::from)
                .toList();
    }

    @Transactional
    public MediaResponse uploadImage(UUID brokerId, UUID propertyId, MultipartFile file, boolean thumbnail) {
        Property property = requireOwnedPropertyForUpdate(brokerId, propertyId);
        if (media.countByPropertyIdAndMediaType(propertyId, MediaType.IMAGE) >= MAX_IMAGES_PER_PROPERTY) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "A property can have at most 7 images");
        }
        String url = storage.store(propertyId, file, MediaType.IMAGE);
        return saveWithFileCleanup(Media.create(property, MediaType.IMAGE, url, thumbnail), url);
    }

    @Transactional
    public MediaResponse uploadVideoFile(UUID brokerId, UUID propertyId, MultipartFile file) {
        Property property = requireOwnedPropertyForUpdate(brokerId, propertyId);
        ensureNoVideo(propertyId);
        String url = storage.store(propertyId, file, MediaType.VIDEO_FILE);
        return saveWithFileCleanup(Media.create(property, MediaType.VIDEO_FILE, url, false), url);
    }

    @Transactional
    public MediaResponse addVideoLink(UUID brokerId, UUID propertyId, CreateVideoLinkRequest request) {
        Property property = requireOwnedPropertyForUpdate(brokerId, propertyId);
        ensureNoVideo(propertyId);
        String url = normalizeVideoLink(request.url());
        return saveMedia(Media.create(property, MediaType.VIDEO_LINK, url, false));
    }

    @Transactional
    public void delete(UUID brokerId, UUID propertyId, UUID mediaId) {
        requireOwnedPropertyForUpdate(brokerId, propertyId);
        Media existing = media.findByIdAndPropertyId(mediaId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Media not found"));
        media.delete(existing);
        storage.deleteIfLocal(existing.getUrl());
    }

    private void ensureNoVideo(UUID propertyId) {
        if (media.existsByPropertyIdAndMediaTypeIn(propertyId, VIDEO_TYPES)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "A property can have at most one video");
        }
    }

    private Property requireOwnedProperty(UUID brokerId, UUID propertyId) {
        return requireOwnedProperty(brokerId, propertyId, false);
    }

    private Property requireOwnedPropertyForUpdate(UUID brokerId, UUID propertyId) {
        return requireOwnedProperty(brokerId, propertyId, true);
    }

    private Property requireOwnedProperty(UUID brokerId, UUID propertyId, boolean lockForUpdate) {
        User user = users.findById(brokerId)
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

        Property property = (lockForUpdate ? properties.findByIdForUpdate(propertyId) : properties.findById(propertyId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        if (!property.getBroker().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Property belongs to another broker");
        }
        return property;
    }

    private Property findPublicProperty(UUID propertyId) {
        Property property = properties.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        if (property.getStatus() == PropertyStatus.HIDDEN) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found");
        }
        return property;
    }

    private String normalizeVideoLink(String value) {
        String url = value.trim();
        try {
            URI uri = new URI(url);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))
                    || uri.getHost() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Video link must be an absolute HTTP(S) URL");
            }
            return uri.toString();
        } catch (URISyntaxException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Video link must be a valid URL", exception);
        }
    }

    private MediaResponse saveWithFileCleanup(Media entity, String storedUrl) {
        try {
            return saveMedia(entity);
        } catch (RuntimeException exception) {
            cleanupStoredFile(storedUrl, exception);
            throw exception;
        }
    }

    private MediaResponse saveMedia(Media entity) {
        try {
            return MediaResponse.from(media.saveAndFlush(entity));
        } catch (DataIntegrityViolationException exception) {
            throw translateMediaIntegrityException(exception);
        }
    }

    private RuntimeException translateMediaIntegrityException(DataIntegrityViolationException exception) {
        if (isSingleVideoConstraint(exception)) {
            return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "A property can have at most one video", exception);
        }
        return exception;
    }

    private boolean isSingleVideoConstraint(Throwable exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof ConstraintViolationException constraintViolation
                    && "uk_media_single_video_per_property".equals(constraintViolation.getConstraintName())) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private void cleanupStoredFile(String storedUrl, RuntimeException originalException) {
        try {
            storage.deleteIfLocal(storedUrl);
        } catch (RuntimeException cleanupException) {
            originalException.addSuppressed(cleanupException);
        }
    }
}
