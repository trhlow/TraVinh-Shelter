package com.travinh.realty.modules.admin;

import com.travinh.realty.common.dto.PagedResponse;
import com.travinh.realty.modules.admin.model.AuditAction;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.property.PropertyService;
import com.travinh.realty.modules.property.dto.PropertyResponse;
import com.travinh.realty.modules.property.dto.UpdatePropertyStatusRequest;
import com.travinh.realty.modules.property.model.PropertyStatus;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPropertyController {
    private final PropertyService properties;
    private final AuditService audit;

    public AdminPropertyController(PropertyService properties, AuditService audit) {
        this.properties = properties;
        this.audit = audit;
    }

    @GetMapping("/properties")
    public PagedResponse<PropertyResponse> listProperties(@RequestParam MultiValueMap<String, String> params,
                                                          @PageableDefault(size = 50) Pageable pageable) {
        return PagedResponse.from(properties.adminList(params, pageable));
    }

    @PatchMapping("/properties/{propertyId}/status")
    public PropertyResponse updatePropertyStatus(@PathVariable UUID propertyId,
                                                 @Valid @RequestBody UpdatePropertyStatusRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        PropertyResponse updated = properties.adminUpdateStatus(propertyId, request.status());
        AuditAction action = request.status() == PropertyStatus.HIDDEN
                ? AuditAction.HIDE_PROPERTY : AuditAction.UPDATE_PROPERTY_STATUS;
        String detail = request.status() == PropertyStatus.HIDDEN
                ? "Gỡ bài đăng khỏi trang công khai" : "Đổi trạng thái sang " + request.status();
        audit.record(principal.id(), action, "Property", propertyId, updated.title(), detail);
        return updated;
    }
}
