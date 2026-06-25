package com.travinh.realty.modules.media.repository;

import com.travinh.realty.modules.media.model.Media;
import com.travinh.realty.modules.media.model.MediaType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaRepository extends JpaRepository<Media, UUID> {
    List<Media> findByPropertyIdOrderByUploadedAtAsc(UUID propertyId);
    long countByPropertyIdAndMediaType(UUID propertyId, MediaType mediaType);
    boolean existsByPropertyIdAndMediaTypeIn(UUID propertyId, Collection<MediaType> mediaTypes);
    Optional<Media> findByIdAndPropertyId(UUID id, UUID propertyId);
}
