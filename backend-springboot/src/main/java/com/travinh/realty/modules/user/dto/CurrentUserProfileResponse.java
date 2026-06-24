package com.travinh.realty.modules.user.dto;

import com.travinh.realty.modules.user.model.User;
import java.time.Instant;
import java.util.UUID;

public record CurrentUserProfileResponse(UUID id, String username, String fullName, String phone,
                                         String email, Instant createdAt) {
    public static CurrentUserProfileResponse from(User user) {
        return new CurrentUserProfileResponse(user.getId(), user.getUsername(), user.getFullName(), user.getPhone(),
                user.getEmail(), user.getCreatedAt());
    }
}
