package com.travinh.realty.modules.auth.security;

import java.time.Duration;
import java.time.Instant;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Shares JWT revocation state across all backend instances via Redis, so a logout on one
 * instance is honored immediately by every other instance behind the load balancer.
 */
public class RedisRevokedTokenStore implements RevokedTokenStore {
    private static final String KEY_PREFIX = "revoked-jwt:";

    private final StringRedisTemplate redisTemplate;

    public RedisRevokedTokenStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void revoke(String tokenId, Instant expiresAt) {
        if (tokenId == null || tokenId.isBlank() || expiresAt == null) {
            return;
        }
        Duration ttl = Duration.between(Instant.now(), expiresAt);
        if (ttl.isNegative() || ttl.isZero()) {
            return;
        }
        redisTemplate.opsForValue().set(KEY_PREFIX + tokenId, "1", ttl);
    }

    @Override
    public boolean isRevoked(String tokenId) {
        if (tokenId == null || tokenId.isBlank()) {
            return false;
        }
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + tokenId));
    }
}
