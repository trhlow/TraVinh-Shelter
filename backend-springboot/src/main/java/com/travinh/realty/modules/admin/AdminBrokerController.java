package com.travinh.realty.modules.admin;

import com.travinh.realty.common.dto.PagedResponse;
import com.travinh.realty.modules.admin.model.AuditAction;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.UserProfileService;
import com.travinh.realty.modules.user.dto.CreateBrokerRequest;
import com.travinh.realty.modules.user.dto.UpdateUserStatusRequest;
import com.travinh.realty.modules.user.dto.UserProfileResponse;
import com.travinh.realty.modules.user.model.UserStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBrokerController {
    private final UserProfileService profiles;
    private final AuditService audit;

    public AdminBrokerController(UserProfileService profiles, AuditService audit) {
        this.profiles = profiles;
        this.audit = audit;
    }

    @PostMapping("/brokers")
    @ResponseStatus(HttpStatus.CREATED)
    public UserProfileResponse createBroker(@Valid @RequestBody CreateBrokerRequest request,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        UserProfileResponse created = profiles.createBroker(request);
        audit.record(principal.id(), AuditAction.CREATE_BROKER, "User", created.id(),
                created.fullName(), "Cấp tài khoản môi giới mới");
        return created;
    }

    @GetMapping("/users")
    public PagedResponse<UserProfileResponse> listUsers(@RequestParam(required = false) String q,
                                                        @RequestParam(required = false) UserStatus status,
                                                        @PageableDefault(size = 50) Pageable pageable) {
        return PagedResponse.from(profiles.listUsers(q, status, pageable));
    }

    @GetMapping("/brokers")
    public PagedResponse<UserProfileResponse> listBrokers(@RequestParam(required = false) String q,
                                                          @RequestParam(required = false) UserStatus status,
                                                          @PageableDefault(size = 50) Pageable pageable) {
        return PagedResponse.from(profiles.listBrokers(q, status, pageable));
    }

    @PatchMapping("/users/{userId}/status")
    public UserProfileResponse updateUserStatus(@PathVariable UUID userId,
                                                @Valid @RequestBody UpdateUserStatusRequest request,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        UserProfileResponse updated = profiles.updateUserStatus(userId, request.status());
        AuditAction action = request.status() == UserStatus.LOCKED ? AuditAction.LOCK_USER : AuditAction.UNLOCK_USER;
        String detail = request.status() == UserStatus.LOCKED ? "Khóa tài khoản" : "Mở khóa tài khoản";
        audit.record(principal.id(), action, "User", userId, updated.fullName(), detail);
        return updated;
    }
}
