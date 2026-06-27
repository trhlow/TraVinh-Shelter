package com.travinh.realty.modules.property;

import com.travinh.realty.common.dto.PagedResponse;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.property.dto.CreatePropertyRequest;
import com.travinh.realty.modules.property.dto.PropertyResponse;
import com.travinh.realty.modules.property.dto.UpdatePropertyRequest;
import com.travinh.realty.modules.property.dto.UpdatePropertyStatusRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/properties")
@Tag(name = "Properties", description = "Search and manage real-estate listings")
public class PropertyController {
    private final PropertyService properties;

    public PropertyController(PropertyService properties) {
        this.properties = properties;
    }

    @GetMapping
    @Operation(summary = "Search visible property listings")
    public PagedResponse<PropertyResponse> search(@RequestParam MultiValueMap<String, String> params,
                                                  @PageableDefault(size = 20) Pageable pageable) {
        return PagedResponse.from(properties.search(params, pageable));
    }

    @GetMapping("/{propertyId}")
    @Operation(summary = "Get public property detail")
    public PropertyResponse detail(@PathVariable UUID propertyId) {
        return properties.publicDetail(propertyId);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "List properties owned by the current broker", security = @SecurityRequirement(name = "bearerAuth"))
    public PagedResponse<PropertyResponse> mine(@AuthenticationPrincipal UserPrincipal principal,
                                                @PageableDefault(size = 50) Pageable pageable) {
        return PagedResponse.from(properties.mine(principal.id(), pageable));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "Create a broker-owned property listing", security = @SecurityRequirement(name = "bearerAuth"))
    public PropertyResponse create(@AuthenticationPrincipal UserPrincipal principal,
                                   @Valid @RequestBody CreatePropertyRequest request) {
        return properties.create(principal.id(), request);
    }

    @PatchMapping("/{propertyId}")
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "Update a broker-owned property listing", security = @SecurityRequirement(name = "bearerAuth"))
    public PropertyResponse update(@AuthenticationPrincipal UserPrincipal principal,
                                   @PathVariable UUID propertyId,
                                   @Valid @RequestBody UpdatePropertyRequest request) {
        return properties.update(principal.id(), propertyId, request);
    }

    @PatchMapping("/{propertyId}/status")
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "Change listing status", security = @SecurityRequirement(name = "bearerAuth"))
    public PropertyResponse updateStatus(@AuthenticationPrincipal UserPrincipal principal,
                                         @PathVariable UUID propertyId,
                                         @Valid @RequestBody UpdatePropertyStatusRequest request) {
        return properties.updateStatus(principal.id(), propertyId, request.status());
    }

    @DeleteMapping("/{propertyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "Delete a broker-owned property listing", security = @SecurityRequirement(name = "bearerAuth"))
    public void delete(@AuthenticationPrincipal UserPrincipal principal,
                       @PathVariable UUID propertyId) {
        properties.delete(principal.id(), propertyId);
    }
}
