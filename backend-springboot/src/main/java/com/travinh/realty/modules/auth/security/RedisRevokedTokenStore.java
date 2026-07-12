package com.travinh.realty.modules.auth.security;

import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Shares JWT revocation state across all backend instances via Redis, so a logout on one
 * instance is honored immediately by every other instance behind the load balancer.
 *
 * <p>Revocation is defense-in-depth on top of JWT signature/expiry checks, not the only line
 * of defense, so a Redis outage fails open (a token is treated as not-revoked, logged as a
 * warning) instead of turning into a 500 on every authenticated request.
 */
public class RedisRevokedTokenStore implements RevokedTokenStore {
    private static final Logger log = LoggerFactory.getLogger(RedisRevokedTokenStore.class);
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
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + tokenId, "1", ttl);
        } catch (DataAccessException exception) {
            log.warn("Redis unavailable, could not record token revocation; the token will "
                    + "remain valid until it naturally expires", exception);
        }
    }

    @Override
    public boolean isRevoked(String tokenId) {
        if (tokenId == null || tokenId.isBlank()) {
            return false;
        }
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + tokenId));
        } catch (DataAccessException exception) {
            log.warn("Redis unavailable, failing open on revocation check", exception);
            return false;
        }
    }
}
