package com.travinh.realty.modules.admin;

import com.travinh.realty.common.dto.PagedResponse;
import com.travinh.realty.modules.admin.dto.AuditLogResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAuditLogController {
    private final AuditService audit;

    public AdminAuditLogController(AuditService audit) {
        this.audit = audit;
    }

    @GetMapping("/audit-logs")
    public PagedResponse<AuditLogResponse> list(@PageableDefault(size = 50) Pageable pageable) {
        return PagedResponse.from(audit.list(pageable));
    }
}
