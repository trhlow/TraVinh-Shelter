package com.travinh.realty.common.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Spring Boot 4's RestClient auto-configuration now lives in the separate
 * spring-boot-starter-restclient module, which is not pulled in transitively by
 * spring-boot-starter-web. Declaring the builder bean here keeps RestClient.Builder
 * injectable (e.g. into EsmsSmsSender) without adding a new Maven dependency.
 *
 * <p>Connect/read timeouts are set explicitly because outbound calls (e.g. the SMS
 * gateway) have no SLA guarantee — without a timeout a slow or hung upstream would
 * block the calling thread indefinitely.
 */
@Configuration
public class RestClientConfig {

    @Bean
    public ClientHttpRequestFactory clientHttpRequestFactory() {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(5));
        return factory;
    }

    @Bean
    public RestClient.Builder restClientBuilder(ClientHttpRequestFactory clientHttpRequestFactory) {
        return RestClient.builder().requestFactory(clientHttpRequestFactory);
    }
}
