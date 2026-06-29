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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final int DEFAULT_LIMIT = 10;
    private static final Pattern VIEWING_SUBMIT_PATH = Pattern.compile("^/properties/[^/]+/viewings$");

    // path-group -> requests allowed per WINDOW per IP; tunable independently per group.
    private static final Map<String, Integer> RATE_LIMITED_GROUPS = rateLimitedGroups();

    private final ObjectMapper objectMapper;
    private final Map<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    public AuthRateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        Integer limit = isRateLimitedPath(request);
        if (limit == null || allow(request, limit)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        objectMapper.writeValue(response.getOutputStream(), new ApiError(Instant.now(),
                HttpStatus.TOO_MANY_REQUESTS.value(),
                HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                "Too many requests. Please retry later.",
                Map.of()));
    }

    private Integer isRateLimitedPath(HttpServletRequest request) {
        if (!HttpMethod.POST.matches(request.getMethod())) {
            return null;
        }
        return RATE_LIMITED_GROUPS.get(rateLimitGroup(requestPath(request)));
    }

    private String rateLimitGroup(String path) {
        if ("/auth/login".equals(path)) {
            return "/auth/login";
        }
        if (VIEWING_SUBMIT_PATH.matcher(path).matches()) {
            return "/properties/*/viewings";
        }
        return null;
    }

    private boolean allow(HttpServletRequest request, int limit) {
        String key = clientIp(request) + ":" + requestPath(request);
        Instant now = Instant.now();
        AttemptWindow window = attempts.compute(key, (_ignored, existing) -> {
            if (existing == null || existing.expiresAt().isBefore(now)) {
                return new AttemptWindow(new AtomicInteger(1), now.plus(WINDOW));
            }
            existing.count().incrementAndGet();
            return existing;
        });
        return window.count().get() <= limit;
    }

    private static Map<String, Integer> rateLimitedGroups() {
        Map<String, Integer> groups = new LinkedHashMap<>();
        groups.put("/auth/login", DEFAULT_LIMIT);
        groups.put("/properties/*/viewings", DEFAULT_LIMIT);
        return groups;
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
