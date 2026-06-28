package com.travinh.realty.modules.user.dto;

import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import java.time.Instant;
import java.util.UUID;

public record CurrentUserProfileResponse(UUID id, String username, String fullName, String phone, String avatarUrl,
                                         String email, UserRole role, UserStatus status, Instant createdAt) {
    public static CurrentUserProfileResponse from(User user) {
        return new CurrentUserProfileResponse(user.getId(), user.getUsername(), user.getFullName(), user.getPhone(),
                user.getAvatarUrl(), user.getEmail(), user.getRole(), user.getStatus(), user.getCreatedAt());
    }
}
