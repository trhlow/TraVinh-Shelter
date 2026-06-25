package com.travinh.realty.modules.media.model;

import com.travinh.realty.modules.property.model.Property;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "media")
public class Media {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "media_type", nullable = false, columnDefinition = "media_type")
    private MediaType mediaType;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(name = "is_thumbnail", nullable = false)
    private boolean thumbnail;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    protected Media() {
    }

    public static Media create(Property property, MediaType mediaType, String url, boolean thumbnail) {
        Media media = new Media();
        media.property = property;
        media.mediaType = mediaType;
        media.url = url;
        media.thumbnail = thumbnail;
        return media;
    }

    public UUID getId() { return id; }
    public Property getProperty() { return property; }
    public MediaType getMediaType() { return mediaType; }
    public String getUrl() { return url; }
    public boolean isThumbnail() { return thumbnail; }
    public Instant getUploadedAt() { return uploadedAt; }
}
