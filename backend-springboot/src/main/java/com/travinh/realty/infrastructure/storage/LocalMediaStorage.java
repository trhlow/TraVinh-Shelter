package com.travinh.realty.infrastructure.storage;

import com.travinh.realty.modules.media.model.MediaType;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LocalMediaStorage {
    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private static final Set<String> VIDEO_CONTENT_TYPES = Set.of("video/mp4", "video/webm", "video/quicktime");
    private static final Map<String, String> EXTENSIONS_BY_CONTENT_TYPE = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif",
            "video/mp4", ".mp4",
            "video/webm", ".webm",
            "video/quicktime", ".mov");

    private final Path storageRoot;
    private final String publicUrlPrefix;

    public LocalMediaStorage(StorageProperties properties) {
        this.storageRoot = Path.of(properties.localPath()).toAbsolutePath().normalize();
        this.publicUrlPrefix = normalizePublicUrlPrefix(properties.publicUrlPrefix());
    }

    public String store(UUID propertyId, MultipartFile file, MediaType mediaType) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Media file is required");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        validateContentType(mediaType, contentType);

        Path propertyDirectory = storageRoot.resolve("properties").resolve(propertyId.toString()).normalize();
        if (!propertyDirectory.startsWith(storageRoot)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid storage path");
        }

        String filename = UUID.randomUUID() + EXTENSIONS_BY_CONTENT_TYPE.get(contentType);
        Path target = propertyDirectory.resolve(filename).normalize();
        if (!target.startsWith(propertyDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid media filename");
        }

        try {
            Files.createDirectories(propertyDirectory);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return publicUrlPrefix + "/properties/" + propertyId + "/" + filename;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store media file", exception);
        }
    }

    public void deleteIfLocal(String url) {
        String localPath = localPathFromPublicUrl(url);
        if (localPath == null) {
            return;
        }
        Path target = storageRoot.resolve(localPath).normalize();
        if (!target.startsWith(storageRoot)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not delete media file", exception);
        }
    }

    public Path storageRoot() {
        return storageRoot;
    }

    public String publicUrlPrefix() {
        return publicUrlPrefix;
    }

    private void validateContentType(MediaType mediaType, String contentType) {
        if (mediaType == MediaType.IMAGE && !IMAGE_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only image uploads are allowed");
        }
        if (mediaType == MediaType.VIDEO_FILE && !VIDEO_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only video uploads are allowed");
        }
    }

    private String localPathFromPublicUrl(String url) {
        if (url == null) {
            return null;
        }
        String normalizedUrl = url.trim();
        String configuredPrefix = publicUrlPrefix + "/";
        if (normalizedUrl.startsWith(configuredPrefix)) {
            return normalizedUrl.substring(configuredPrefix.length());
        }
        if (!"/media".equals(publicUrlPrefix) && normalizedUrl.startsWith("/media/")) {
            return normalizedUrl.substring("/media/".length());
        }
        return null;
    }

    private String normalizePublicUrlPrefix(String value) {
        String prefix = value == null || value.isBlank() ? "/media" : value.trim();
        if (!prefix.startsWith("/")) {
            prefix = "/" + prefix;
        }
        while (prefix.length() > 1 && prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.length() - 1);
        }
        return prefix;
    }
}
