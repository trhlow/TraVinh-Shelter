package com.travinh.realty.modules.admin;

import com.travinh.realty.modules.admin.dto.AuditLogResponse;
import com.travinh.realty.modules.admin.model.AuditAction;
import com.travinh.realty.modules.admin.model.AuditLog;
import com.travinh.realty.modules.admin.repository.AuditLogRepository;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {
    private final AuditLogRepository auditLogs;
    private final UserRepository users;

    public AuditService(AuditLogRepository auditLogs, UserRepository users) {
        this.auditLogs = auditLogs;
        this.users = users;
    }

    @Transactional
    public void record(UUID actorId, AuditAction action, String entityName, UUID entityId,
                        String targetLabel, String detail) {
        User actor = users.getReferenceById(actorId);
        auditLogs.save(AuditLog.record(actor, action, entityName, entityId, targetLabel, detail));
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> list(Pageable pageable) {
        Pageable effective = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                        Sort.by(Sort.Direction.DESC, "timestamp"));
        return auditLogs.findAll(effective).map(AuditLogResponse::from);
    }
}
