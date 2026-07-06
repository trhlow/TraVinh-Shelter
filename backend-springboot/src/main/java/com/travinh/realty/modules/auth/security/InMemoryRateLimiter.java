package com.travinh.realty.modules.auth.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Single-instance fallback used when no Redis connection is configured (e.g. slice tests).
 * Does not share attempt counts across backend instances — see {@link RedisRateLimiter}.
 */
public class InMemoryRateLimiter implements RateLimiter {
    private final Map<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    @Override
    public boolean tryAcquire(String key, int limit, Duration window) {
        Instant now = Instant.now();
        AttemptWindow attemptWindow = attempts.compute(key, (_ignored, existing) -> {
            if (existing == null || existing.expiresAt().isBefore(now)) {
                return new AttemptWindow(new AtomicInteger(1), now.plus(window));
            }
            existing.count().incrementAndGet();
            return existing;
        });
        return attemptWindow.count().get() <= limit;
    }

    private record AttemptWindow(AtomicInteger count, Instant expiresAt) {
    }
}
