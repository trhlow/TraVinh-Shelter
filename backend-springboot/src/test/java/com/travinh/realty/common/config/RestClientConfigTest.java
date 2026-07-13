package com.travinh.realty.common.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

class RestClientConfigTest {

    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void readTimeoutIsEnforcedForSlowResponses() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/slow", exchange -> {
            try {
                Thread.sleep(7000);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            exchange.sendResponseHeaders(200, 0);
            exchange.close();
        });
        server.start();
        int port = server.getAddress().getPort();

        RestClientConfig config = new RestClientConfig();
        RestClient client = config.restClientBuilder(config.clientHttpRequestFactory()).build();

        assertThatThrownBy(() -> client.get()
                .uri("http://localhost:" + port + "/slow")
                .retrieve()
                .toBodilessEntity())
                .isInstanceOf(ResourceAccessException.class);
    }
}
