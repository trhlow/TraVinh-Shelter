package com.travinh.realty.modules.auth.security;

import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

/**
 * Fixed-window rate limiter backed by Redis so the attempt count is shared across all
 * backend instances behind the load balancer, instead of one counter per node.
 *
 * <p>The increment and the first-hit expiry are set atomically in one Lua script — doing
 * them as two separate INCR/EXPIRE calls would leave the key without a TTL forever if the
 * process crashed in between, permanently rate-limiting that key.
 *
 * <p>Rate limiting is defense-in-depth, not the only line of defense, so a Redis outage
 * fails open (the request is allowed through, logged as a warning) instead of a 500 on
 * every login/viewing-submission attempt.
 */
public class RedisRateLimiter implements RateLimiter {
    private static final Logger log = LoggerFactory.getLogger(RedisRateLimiter.class);
    private static final String KEY_PREFIX = "rate-limit:";
    private static final DefaultRedisScript<Long> INCREMENT_AND_EXPIRE_ON_FIRST_HIT = new DefaultRedisScript<>(
            "local count = redis.call('INCR', KEYS[1]) "
                    + "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end "
                    + "return count",
            Long.class);

    private final StringRedisTemplate redisTemplate;

    public RedisRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean tryAcquire(String key, int limit, Duration window) {
        try {
            Long count = redisTemplate.execute(INCREMENT_AND_EXPIRE_ON_FIRST_HIT,
                    List.of(KEY_PREFIX + key), String.valueOf(window.toMillis()));
            return count != null && count <= limit;
        } catch (DataAccessException exception) {
            log.warn("Redis unavailable, failing open on rate limit check for key {}", key, exception);
            return true;
        }
    }
}
