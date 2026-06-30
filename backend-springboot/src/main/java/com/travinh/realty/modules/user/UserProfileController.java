package com.travinh.realty.modules.user;

import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.dto.BrokerContactResponse;
import com.travinh.realty.modules.user.dto.ChangePasswordRequest;
import com.travinh.realty.modules.user.dto.CurrentUserProfileResponse;
import com.travinh.realty.modules.user.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @PatchMapping("/users/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal UserPrincipal principal,
                               @Valid @RequestBody ChangePasswordRequest request) {
        profiles.changePassword(principal, request);
    }

    @PostMapping(path = "/users/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CurrentUserProfileResponse uploadAvatar(@AuthenticationPrincipal UserPrincipal principal,
                                                   @RequestPart("file") MultipartFile file) {
        return profiles.uploadAvatar(principal, file);
    }

    @GetMapping("/brokers/{brokerId}")
    public BrokerContactResponse brokerContact(@PathVariable UUID brokerId) {
        return profiles.brokerContact(brokerId);
    }
}
