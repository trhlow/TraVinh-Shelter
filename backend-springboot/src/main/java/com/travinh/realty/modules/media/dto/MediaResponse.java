package com.travinh.realty.modules.media.dto;

import com.travinh.realty.modules.media.model.Media;
import com.travinh.realty.modules.media.model.MediaType;
import java.time.Instant;
import java.util.UUID;

public record MediaResponse(UUID id, UUID propertyId, MediaType mediaType, String url,
                            boolean thumbnail, Instant uploadedAt) {
    public static MediaResponse from(Media media) {
        return new MediaResponse(media.getId(), media.getProperty().getId(), media.getMediaType(), media.getUrl(),
                media.isThumbnail(), media.getUploadedAt());
    }
}
