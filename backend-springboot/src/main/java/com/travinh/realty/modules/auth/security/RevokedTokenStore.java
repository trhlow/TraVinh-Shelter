package com.travinh.realty.modules.auth.security;

import java.time.Instant;

public interface RevokedTokenStore {
    void revoke(String tokenId, Instant expiresAt);

    boolean isRevoked(String tokenId);
}
