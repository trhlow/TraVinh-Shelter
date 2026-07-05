package com.travinh.realty.modules.admin.dto;

import com.travinh.realty.modules.admin.model.AuditAction;
import com.travinh.realty.modules.admin.model.AuditLog;
import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(UUID id, AuditAction action, String actorEmail, String targetLabel,
                               String detail, Instant createdAt) {
    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(log.getId(), log.getAction(), log.getActor().getEmail(),
                log.getTargetLabel(), log.getDetail(), log.getTimestamp());
    }
}
