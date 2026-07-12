package com.travinh.realty.modules.auth.security;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Single-instance fallback used when no Redis connection is configured (e.g. slice tests).
 * Does not share OTP state across backend instances — see {@link RedisOtpStore}.
 */
public class InMemoryOtpStore implements OtpStore {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, OtpEntry> codes = new ConcurrentHashMap<>();

    @Override
    public String generate(String key, Duration ttl) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        codes.put(key, new OtpEntry(code, Instant.now().plus(ttl)));
        return code;
    }

    @Override
    public boolean verify(String key, String code) {
        OtpEntry entry = codes.get(key);
        if (entry == null || entry.expiresAt().isBefore(Instant.now()) || !entry.code().equals(code)) {
            return false;
        }
        codes.remove(key, entry);
        return true;
    }

    private record OtpEntry(String code, Instant expiresAt) {
    }
}
