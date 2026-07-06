package com.travinh.realty.modules.auth.security;

import java.time.Duration;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Fixed-window rate limiter backed by Redis INCR/EXPIRE so the attempt count is shared
 * across all backend instances behind the load balancer, instead of one counter per node.
 */
public class RedisRateLimiter implements RateLimiter {
    private static final String KEY_PREFIX = "rate-limit:";

    private final StringRedisTemplate redisTemplate;

    public RedisRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean tryAcquire(String key, int limit, Duration window) {
        String redisKey = KEY_PREFIX + key;
        Long count = redisTemplate.opsForValue().increment(redisKey);
        if (count != null && count == 1L) {
            redisTemplate.expire(redisKey, window);
        }
        return count != null && count <= limit;
    }
}
