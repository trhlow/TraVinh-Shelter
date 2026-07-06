package com.travinh.realty.modules.auth.security;

import java.time.Duration;

public interface RateLimiter {
    /**
     * @return true if the caller identified by {@code key} is within {@code limit} attempts
     * for the current {@code window}, false if the limit has been exceeded.
     */
    boolean tryAcquire(String key, int limit, Duration window);
}
