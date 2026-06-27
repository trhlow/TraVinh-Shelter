package com.travinh.realty.infrastructure.storage;

import com.travinh.realty.modules.media.model.MediaType;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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
        validateFileSignature(file, contentType);

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

    private void validateFileSignature(MultipartFile file, String contentType) {
        byte[] header = new byte[16];
        int read;
        try (InputStream input = file.getInputStream()) {
            read = input.read(header);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read media file", exception);
        }
        if (read <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Media file is required");
        }

        String detected = detectKnownContentType(header, read);
        if (detected != null && !detected.equals(contentType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Media content does not match the declared content type");
        }
        if (looksLikeActiveContent(header, read)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Media content does not match allowed upload types");
        }
    }

    private String detectKnownContentType(byte[] header, int read) {
        if (read >= 3 && (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8 && (header[2] & 0xff) == 0xff) {
            return "image/jpeg";
        }
        if (read >= 8 && header[0] == (byte) 0x89 && header[1] == 0x50 && header[2] == 0x4e
                && header[3] == 0x47 && header[4] == 0x0d && header[5] == 0x0a
                && header[6] == 0x1a && header[7] == 0x0a) {
            return "image/png";
        }
        if (read >= 6 && header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46
                && header[3] == 0x38 && (header[4] == 0x37 || header[4] == 0x39) && header[5] == 0x61) {
            return "image/gif";
        }
        if (read >= 12 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50) {
            return "image/webp";
        }
        return null;
    }

    private boolean looksLikeActiveContent(byte[] header, int read) {
        String prefix = new String(header, 0, read, StandardCharsets.ISO_8859_1)
                .trim()
                .toLowerCase(Locale.ROOT);
        return prefix.startsWith("<html")
                || prefix.startsWith("<script")
                || prefix.startsWith("<?xml")
                || prefix.startsWith("%pdf")
                || prefix.startsWith("pk")
                || prefix.startsWith("mz")
                || prefix.startsWith("#!");
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
