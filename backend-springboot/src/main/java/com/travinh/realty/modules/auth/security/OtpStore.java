package com.travinh.realty.modules.auth.security;

import java.time.Duration;

public interface OtpStore {
    /**
     * Generates a 6-digit code, stores it under {@code key} for {@code ttl}, and returns it.
     */
    String generate(String key, Duration ttl);

    /**
     * @return true if {@code code} matches the code currently stored under {@code key} (and the
     * entry is not expired) — in which case the entry is deleted (single-use). A wrong code
     * returns false without deleting the entry, allowing retries within the TTL window.
     */
    boolean verify(String key, String code);
}
