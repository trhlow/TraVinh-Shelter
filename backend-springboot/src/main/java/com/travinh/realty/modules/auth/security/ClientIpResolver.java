package com.travinh.realty.modules.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.security.web.util.matcher.IpAddressMatcher;

/**
 * Resolves the caller's IP for rate limiting. X-Forwarded-For is only honored when the
 * immediate TCP peer is a known reverse proxy (e.g. the bundled nginx container); otherwise
 * the header is attacker-controlled and trusting it would let anyone spoof their identity
 * to dodge the login rate limiter.
 *
 * <p>When trusted, the LAST comma-separated entry is used, not the first: nginx's
 * {@code $proxy_add_x_forwarded_for} appends its own view of the peer to whatever the
 * client already sent rather than replacing it, so anything before that last entry may be
 * attacker-supplied.
 */
public class ClientIpResolver {
    private final List<IpAddressMatcher> trustedProxies;

    public ClientIpResolver(List<String> trustedProxyCidrs) {
        this.trustedProxies = trustedProxyCidrs.stream().map(IpAddressMatcher::new).toList();
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (!isTrustedProxy(remoteAddr)) {
            return remoteAddr;
        }
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor == null || forwardedFor.isBlank()) {
            return remoteAddr;
        }
        String[] chain = forwardedFor.split(",");
        return chain[chain.length - 1].trim();
    }

    private boolean isTrustedProxy(String remoteAddr) {
        return trustedProxies.stream().anyMatch(matcher -> matcher.matches(remoteAddr));
    }
}
