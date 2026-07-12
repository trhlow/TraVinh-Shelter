package com.travinh.realty.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Spring Boot 4's RestClient auto-configuration now lives in the separate
 * spring-boot-starter-restclient module, which is not pulled in transitively by
 * spring-boot-starter-web. Declaring the builder bean here keeps RestClient.Builder
 * injectable (e.g. into EsmsSmsSender) without adding a new Maven dependency.
 */
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }
}
