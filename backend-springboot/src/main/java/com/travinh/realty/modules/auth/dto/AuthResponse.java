package com.travinh.realty.modules.auth.dto;

import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import java.util.UUID;

public record AuthResponse(String accessToken, String tokenType, long expiresIn,
                           UUID userId, String email, UserRole role) {
    public static AuthResponse of(String token, long expiresIn, User user) {
        return new AuthResponse(token, "Bearer", expiresIn, user.getId(), user.getEmail(), user.getRole());
    }
}
