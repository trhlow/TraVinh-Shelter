package com.travinh.realty.modules.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.travinh.realty.modules.admin.dto.AuditLogResponse;
import com.travinh.realty.modules.admin.model.AuditAction;
import com.travinh.realty.modules.admin.model.AuditLog;
import com.travinh.realty.modules.admin.repository.AuditLogRepository;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

class AuditServiceTest {
    private AuditLogRepository auditLogs;
    private UserRepository users;
    private AuditService service;

    @BeforeEach
    void setUp() {
        auditLogs = Mockito.mock(AuditLogRepository.class);
        users = Mockito.mock(UserRepository.class);
        service = new AuditService(auditLogs, users);
    }

    @Test
    void recordSavesAuditLogWithResolvedActorReference() {
        UUID actorId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();
        User actor = actor(actorId);
        when(users.getReferenceById(actorId)).thenReturn(actor);
        when(auditLogs.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.record(actorId, AuditAction.CREATE_BROKER, "User", entityId, "Trần Mỹ Linh", "Cấp tài khoản môi giới mới");

        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        Mockito.verify(auditLogs).save(saved.capture());
        assertThat(saved.getValue().getActor()).isEqualTo(actor);
        assertThat(saved.getValue().getAction()).isEqualTo(AuditAction.CREATE_BROKER);
        assertThat(saved.getValue().getEntityName()).isEqualTo("User");
        assertThat(saved.getValue().getEntityId()).isEqualTo(entityId);
        assertThat(saved.getValue().getTargetLabel()).isEqualTo("Trần Mỹ Linh");
        assertThat(saved.getValue().getDetail()).isEqualTo("Cấp tài khoản môi giới mới");
    }

    @Test
    void listReturnsPageOrderedByTimestampDescWhenPageableUnsorted() {
        Pageable unsorted = PageRequest.of(0, 20);
        AuditLog log = auditLog();
        when(auditLogs.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(log)));

        Page<AuditLogResponse> result = service.list(unsorted);

        ArgumentCaptor<Pageable> effective = ArgumentCaptor.forClass(Pageable.class);
        Mockito.verify(auditLogs).findAll(effective.capture());
        assertThat(effective.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "timestamp"));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().getFirst().targetLabel()).isEqualTo(log.getTargetLabel());
    }

    @Test
    void listKeepsCallerSuppliedSortWhenAlreadySorted() {
        Pageable sorted = PageRequest.of(0, 20, Sort.by(Sort.Direction.ASC, "action"));
        when(auditLogs.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        service.list(sorted);

        ArgumentCaptor<Pageable> effective = ArgumentCaptor.forClass(Pageable.class);
        Mockito.verify(auditLogs).findAll(effective.capture());
        assertThat(effective.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.ASC, "action"));
    }

    private User actor(UUID id) {
        User admin = User.register("admin", "admin@example.com", "hash", "Quản trị viên", "0900000000");
        ReflectionTestUtils.setField(admin, "id", id);
        return admin;
    }

    private AuditLog auditLog() {
        AuditLog log = AuditLog.record(actor(UUID.randomUUID()), AuditAction.LOCK_USER, "User",
                UUID.randomUUID(), "Phạm Quốc Huy", "Khóa do vi phạm quy định đăng tin");
        ReflectionTestUtils.setField(log, "id", UUID.randomUUID());
        return log;
    }
}
