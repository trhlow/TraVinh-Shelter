package com.travinh.realty.modules.admin.repository;

import com.travinh.realty.modules.admin.model.AuditLog;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
