package com.travinh.realty.modules.auth.dto;

import com.travinh.realty.modules.user.model.UserRole;
import java.util.UUID;

public record LoginResponse(String accessToken, String tokenType, Long expiresIn,
                            UUID userId, String email, UserRole role, boolean mfaRequired) {
    public static LoginResponse authenticated(AuthResponse auth) {
        return new LoginResponse(auth.accessToken(), auth.tokenType(), auth.expiresIn(),
                auth.userId(), auth.email(), auth.role(), false);
    }

    public static LoginResponse mfaChallenge() {
        return new LoginResponse(null, null, null, null, null, null, true);
    }
}
