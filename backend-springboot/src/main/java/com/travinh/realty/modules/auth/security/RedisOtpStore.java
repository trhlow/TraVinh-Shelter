package com.travinh.realty.modules.auth.security;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Shares OTP state across all backend instances via Redis. Unlike {@link RedisRateLimiter} and
 * {@link RedisRevokedTokenStore}, this store fails <em>closed</em> on a Redis outage: OTP
 * correctness is security-critical, so "Redis is down" must mean "reject the code" and "cannot
 * issue a code" (503), never "treat anything as valid."
 *
 * <p>{@link #verify} checks-and-deletes atomically via a Lua script — a separate GET then
 * DELETE would let two concurrent callers submitting the same correct code both observe it
 * as valid before either deletes it, violating the single-use guarantee.
 */
public class RedisOtpStore implements OtpStore {
    private static final Logger log = LoggerFactory.getLogger(RedisOtpStore.class);
    private static final String KEY_PREFIX = "otp:";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DefaultRedisScript<Long> CHECK_AND_DELETE_IF_MATCH = new DefaultRedisScript<>(
            "local stored = redis.call('GET', KEYS[1]) "
                    + "if stored == ARGV[1] then "
                    + "redis.call('DEL', KEYS[1]) "
                    + "return 1 "
                    + "else "
                    + "return 0 "
                    + "end",
            Long.class);

    private final StringRedisTemplate redisTemplate;

    public RedisOtpStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public String generate(String key, Duration ttl) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + key, code, ttl);
        } catch (DataAccessException exception) {
            log.error("Redis unavailable, cannot generate OTP for key {}", key, exception);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể gửi mã xác minh lúc này, vui lòng thử lại sau.");
        }
        return code;
    }

    @Override
    public boolean verify(String key, String code) {
        try {
            Long result = redisTemplate.execute(CHECK_AND_DELETE_IF_MATCH, List.of(KEY_PREFIX + key), code);
            return result != null && result == 1L;
        } catch (DataAccessException exception) {
            log.error("Redis unavailable, failing closed on OTP verification for key {}", key, exception);
            return false;
        }
    }
}
