package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpResolverTest {

    private static final List<String> TRUSTED_PROXIES =
            List.of("127.0.0.1/32", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16");

    @Test
    void usesForwardedHeaderWhenRequestComesFromATrustedProxy() {
        // nginx's $proxy_add_x_forwarded_for APPENDS its own view of the peer to whatever
        // the client sent, so the trustworthy value is the LAST entry, not the first.
        ClientIpResolver resolver = new ClientIpResolver(TRUSTED_PROXIES);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.5"); // e.g. the nginx reverse-proxy container
        request.addHeader("X-Forwarded-For", "9.9.9.9, 203.0.113.44");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.44");
    }

    @Test
    void ignoresClientInjectedPrefixInForwardedHeaderFromATrustedProxy() {
        // A client can send its own X-Forwarded-For value straight to nginx; nginx does not
        // strip it, it appends the real peer address after it. The prefix must be ignored.
        ClientIpResolver resolver = new ClientIpResolver(TRUSTED_PROXIES);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.5");
        request.addHeader("X-Forwarded-For", "9.9.9.1, 203.0.113.44");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.44");
    }

    @Test
    void ignoresSpoofedForwardedHeaderWhenRequestDoesNotComeFromATrustedProxy() {
        // An attacker hitting the backend directly (bypassing the reverse proxy) can set
        // any X-Forwarded-For value they like — it must not be trusted in that case.
        ClientIpResolver resolver = new ClientIpResolver(TRUSTED_PROXIES);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.99"); // attacker's real, un-spoofable TCP peer address
        request.addHeader("X-Forwarded-For", "1.2.3.4");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.99");
    }

    @Test
    void fallsBackToRemoteAddrWhenTrustedProxySendsNoForwardedHeader() {
        ClientIpResolver resolver = new ClientIpResolver(TRUSTED_PROXIES);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.5");

        assertThat(resolver.resolve(request)).isEqualTo("172.18.0.5");
    }
}
