package com.travinh.realty.modules.admin;

import com.travinh.realty.common.dto.PagedResponse;
import com.travinh.realty.modules.property.PropertyService;
import com.travinh.realty.modules.property.dto.PropertyResponse;
import com.travinh.realty.modules.property.dto.UpdatePropertyStatusRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPropertyController {
    private final PropertyService properties;

    public AdminPropertyController(PropertyService properties) {
        this.properties = properties;
    }

    @GetMapping("/properties")
    public PagedResponse<PropertyResponse> listProperties(@PageableDefault(size = 50) Pageable pageable) {
        return PagedResponse.from(properties.adminList(pageable));
    }

    @PatchMapping("/properties/{propertyId}/status")
    public PropertyResponse updatePropertyStatus(@PathVariable UUID propertyId,
                                                 @Valid @RequestBody UpdatePropertyStatusRequest request) {
        return properties.adminUpdateStatus(propertyId, request.status());
    }
}
