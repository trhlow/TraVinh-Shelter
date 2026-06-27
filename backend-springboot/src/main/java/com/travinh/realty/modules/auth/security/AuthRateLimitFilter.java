package com.travinh.realty.modules.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.travinh.realty.common.exception.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final int MAX_ATTEMPTS_PER_WINDOW = 10;

    private final ObjectMapper objectMapper;
    private final Map<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    public AuthRateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!isProtectedAuthWrite(request) || allow(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        objectMapper.writeValue(response.getOutputStream(), new ApiError(Instant.now(),
                HttpStatus.TOO_MANY_REQUESTS.value(),
                HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                "Too many authentication attempts. Please retry later.",
                Map.of()));
    }

    private boolean isProtectedAuthWrite(HttpServletRequest request) {
        String path = requestPath(request);
        return HttpMethod.POST.matches(request.getMethod())
                && ("/auth/login".equals(path) || "/auth/register".equals(path));
    }

    private boolean allow(HttpServletRequest request) {
        String key = clientIp(request) + ":" + requestPath(request);
        Instant now = Instant.now();
        AttemptWindow window = attempts.compute(key, (_ignored, existing) -> {
            if (existing == null || existing.expiresAt().isBefore(now)) {
                return new AttemptWindow(new AtomicInteger(1), now.plus(WINDOW));
            }
            existing.count().incrementAndGet();
            return existing;
        });
        return window.count().get() <= MAX_ATTEMPTS_PER_WINDOW;
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",", 2)[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String requestPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isBlank() && uri.startsWith(contextPath)) {
            return uri.substring(contextPath.length());
        }
        return uri;
    }

    private record AttemptWindow(AtomicInteger count, Instant expiresAt) {
    }
}
