package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.FilterChain;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.ObjectMapper;

class AuthRateLimitFilterTest {

    @Test
    void rateLimitsPublicPropertySearchAfterSixtyRequestsPerMinutePerIp() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(new ObjectMapper(), new InMemoryRateLimiter(),
                new ClientIpResolver(List.of()));
        FilterChain chain = (request, response) -> {};

        for (int i = 0; i < 60; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/properties");
            request.setRemoteAddr("203.0.113.5");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
            assertThat(response.getStatus()).isEqualTo(200);
        }

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/properties");
        request.setRemoteAddr("203.0.113.5");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getContentAsString()).contains("Quá nhiều yêu cầu. Vui lòng thử lại sau.");
    }

    @Test
    void doesNotRateLimitPropertyDetailByPropertyId() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(new ObjectMapper(), new InMemoryRateLimiter(),
                new ClientIpResolver(List.of()));
        FilterChain chain = (request, response) -> {};
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/properties/some-id");
        request.setRemoteAddr("203.0.113.9");
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 100; i++) {
            filter.doFilterInternal(request, response, chain);
        }

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void postToPropertiesPathIsNotRateLimitedBySearchRule() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(new ObjectMapper(), new InMemoryRateLimiter(),
                new ClientIpResolver(List.of()));
        FilterChain chain = (request, response) -> {};
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/properties");
        request.setRemoteAddr("203.0.113.7");

        for (int i = 0; i < 100; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
            assertThat(response.getStatus()).isEqualTo(200);
        }
    }
}
