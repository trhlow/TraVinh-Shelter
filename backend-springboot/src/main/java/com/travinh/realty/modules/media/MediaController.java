package com.travinh.realty.modules.media;

import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.media.dto.CreateVideoLinkRequest;
import com.travinh.realty.modules.media.dto.MediaResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/properties/{propertyId}/media")
public class MediaController {
    private final MediaService media;

    public MediaController(MediaService media) {
        this.media = media;
    }

    @GetMapping
    public List<MediaResponse> list(@PathVariable UUID propertyId) {
        return media.listPublic(propertyId);
    }

    @PostMapping(path = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('BROKER')")
    public MediaResponse uploadImage(@AuthenticationPrincipal UserPrincipal principal,
                                     @PathVariable UUID propertyId,
                                     @RequestPart("file") MultipartFile file,
                                     @RequestParam(defaultValue = "false") boolean thumbnail) {
        return media.uploadImage(principal, propertyId, file, thumbnail);
    }

    @PostMapping(path = "/video-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('BROKER')")
    public MediaResponse uploadVideoFile(@AuthenticationPrincipal UserPrincipal principal,
                                         @PathVariable UUID propertyId,
                                         @RequestPart("file") MultipartFile file) {
        return media.uploadVideoFile(principal, propertyId, file);
    }

    @PostMapping("/video-link")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('BROKER')")
    public MediaResponse addVideoLink(@AuthenticationPrincipal UserPrincipal principal,
                                      @PathVariable UUID propertyId,
                                      @Valid @RequestBody CreateVideoLinkRequest request) {
        return media.addVideoLink(principal, propertyId, request);
    }

    @DeleteMapping("/{mediaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('BROKER')")
    public void delete(@AuthenticationPrincipal UserPrincipal principal,
                       @PathVariable UUID propertyId,
                       @PathVariable UUID mediaId) {
        media.delete(principal, propertyId, mediaId);
    }
}
