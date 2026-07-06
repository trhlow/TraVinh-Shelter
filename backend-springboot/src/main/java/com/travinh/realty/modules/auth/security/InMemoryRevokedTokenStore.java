package com.travinh.realty.modules.auth.security;

import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Single-instance fallback used when no Redis connection is configured (e.g. slice tests).
 * Does not share revocation state across backend instances — see {@link RedisRevokedTokenStore}.
 */
public class InMemoryRevokedTokenStore implements RevokedTokenStore {
    private final Map<String, Instant> revokedTokenIds = new ConcurrentHashMap<>();

    @Override
    public void revoke(String tokenId, Instant expiresAt) {
        if (tokenId == null || tokenId.isBlank() || expiresAt == null || expiresAt.isBefore(Instant.now())) {
            return;
        }
        cleanupExpired();
        revokedTokenIds.put(tokenId, expiresAt);
    }

    @Override
    public boolean isRevoked(String tokenId) {
        if (tokenId == null || tokenId.isBlank()) {
            return false;
        }
        Instant expiresAt = revokedTokenIds.get(tokenId);
        if (expiresAt == null) {
            return false;
        }
        if (expiresAt.isBefore(Instant.now())) {
            revokedTokenIds.remove(tokenId, expiresAt);
            return false;
        }
        return true;
    }

    private void cleanupExpired() {
        Instant now = Instant.now();
        Iterator<Map.Entry<String, Instant>> iterator = revokedTokenIds.entrySet().iterator();
        while (iterator.hasNext()) {
            if (iterator.next().getValue().isBefore(now)) {
                iterator.remove();
            }
        }
    }
}
