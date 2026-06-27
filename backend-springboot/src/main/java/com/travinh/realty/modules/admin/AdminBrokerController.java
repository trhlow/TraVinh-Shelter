package com.travinh.realty.modules.admin;

import com.travinh.realty.common.dto.PagedResponse;
import com.travinh.realty.modules.user.UserProfileService;
import com.travinh.realty.modules.user.dto.CreateBrokerRequest;
import com.travinh.realty.modules.user.dto.UpdateUserStatusRequest;
import com.travinh.realty.modules.user.dto.UserProfileResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBrokerController {
    private final UserProfileService profiles;

    public AdminBrokerController(UserProfileService profiles) {
        this.profiles = profiles;
    }

    @PostMapping("/brokers")
    @ResponseStatus(HttpStatus.CREATED)
    public UserProfileResponse createBroker(@Valid @RequestBody CreateBrokerRequest request) {
        return profiles.createBroker(request);
    }

    @org.springframework.web.bind.annotation.GetMapping("/users")
    public PagedResponse<UserProfileResponse> listUsers(@PageableDefault(size = 50) Pageable pageable) {
        return PagedResponse.from(profiles.listUsers(pageable));
    }

    @org.springframework.web.bind.annotation.GetMapping("/brokers")
    public PagedResponse<UserProfileResponse> listBrokers(@PageableDefault(size = 50) Pageable pageable) {
        return PagedResponse.from(profiles.listBrokers(pageable));
    }

    @PatchMapping("/users/{userId}/status")
    public UserProfileResponse updateUserStatus(@PathVariable UUID userId,
                                                @Valid @RequestBody UpdateUserStatusRequest request) {
        return profiles.updateUserStatus(userId, request.status());
    }
}
