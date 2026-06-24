package com.travinh.realty.modules.user;

import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.dto.BrokerContactResponse;
import com.travinh.realty.modules.user.dto.CurrentUserProfileResponse;
import com.travinh.realty.modules.user.dto.UpdateProfileRequest;
import com.travinh.realty.modules.user.dto.UserProfileResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class UserProfileController {
    private final UserProfileService profiles;

    public UserProfileController(UserProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping("/users/me")
    public CurrentUserProfileResponse currentProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return profiles.currentProfile(principal);
    }

    @PatchMapping("/users/me")
    public CurrentUserProfileResponse updateCurrentProfile(@AuthenticationPrincipal UserPrincipal principal,
                                                            @Valid @RequestBody UpdateProfileRequest request) {
        return profiles.updateCurrentProfile(principal, request);
    }

    @GetMapping("/brokers/{brokerId}")
    public BrokerContactResponse brokerContact(@PathVariable UUID brokerId) {
        return profiles.brokerContact(brokerId);
    }
}
