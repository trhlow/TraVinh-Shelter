package com.travinh.realty.modules.auth.security;

import tools.jackson.databind.ObjectMapper;
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
import java.util.regex.Pattern;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final int DEFAULT_LIMIT = 10;
    private static final int SEARCH_LIMIT = 60;
    private static final Pattern VIEWING_REQUEST_OTP_PATH = Pattern.compile("^/properties/[^/]+/viewings/request-otp$");
    private static final Pattern VIEWING_VERIFY_OTP_PATH = Pattern.compile("^/properties/[^/]+/viewings/verify-otp$");

    // path-group -> HTTP method + requests allowed per WINDOW per IP; tunable independently per group.
    private static final Map<String, RateLimitRule> RATE_LIMITED_GROUPS = rateLimitedGroups();

    private record RateLimitRule(HttpMethod method, int limit) {
    }

    private final ObjectMapper objectMapper;
    private final RateLimiter rateLimiter;
    private final ClientIpResolver clientIpResolver;

    public AuthRateLimitFilter(ObjectMapper objectMapper, RateLimiter rateLimiter, ClientIpResolver clientIpResolver) {
        this.objectMapper = objectMapper;
        this.rateLimiter = rateLimiter;
        this.clientIpResolver = clientIpResolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String group = rateLimitGroup(requestPath(request));
        RateLimitRule rule = group == null ? null : RATE_LIMITED_GROUPS.get(group);
        if (rule == null || !rule.method().matches(request.getMethod()) || allow(request, group, rule)) {
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

    private String rateLimitGroup(String path) {
        if ("/auth/login".equals(path)) {
            return "/auth/login";
        }
        if (VIEWING_REQUEST_OTP_PATH.matcher(path).matches()) {
            return "/properties/*/viewings/request-otp";
        }
        if (VIEWING_VERIFY_OTP_PATH.matcher(path).matches()) {
            return "/properties/*/viewings/verify-otp";
        }
        if ("/properties".equals(path)) {
            return "/properties";
        }
        return null;
    }

    private boolean allow(HttpServletRequest request, String group, RateLimitRule rule) {
        String key = clientIpResolver.resolve(request) + ":" + group;
        return rateLimiter.tryAcquire(key, rule.limit(), WINDOW);
    }

    private static Map<String, RateLimitRule> rateLimitedGroups() {
        Map<String, RateLimitRule> groups = new LinkedHashMap<>();
        groups.put("/auth/login", new RateLimitRule(HttpMethod.POST, DEFAULT_LIMIT));
        groups.put("/properties/*/viewings/request-otp", new RateLimitRule(HttpMethod.POST, DEFAULT_LIMIT));
        groups.put("/properties/*/viewings/verify-otp", new RateLimitRule(HttpMethod.POST, DEFAULT_LIMIT));
        groups.put("/properties", new RateLimitRule(HttpMethod.GET, SEARCH_LIMIT));
        return groups;
    }

    private String requestPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isBlank() && uri.startsWith(contextPath)) {
            return uri.substring(contextPath.length());
        }
        return uri;
    }
}
