package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.travinh.realty.common.config.JwtProperties;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.StandardEnvironment;

class JwtProfileStartupTest {

    @Test
    void noProfileAndNoJwtSecretFailsFastWithClearMessage() {
        assertThatThrownBy(() -> start(null, "app.jwt.secret="))
                .hasRootCauseMessage("JWT_SECRET environment variable is required when the local profile is not active");
    }

    @Test
    void prodProfileAndNoJwtSecretFailsFastWithClearMessage() {
        assertThatThrownBy(() -> start("prod", "app.jwt.secret="))
                .hasRootCauseMessage("JWT_SECRET environment variable is required when the local profile is not active");
    }

    @Test
    void localProfileStartsWithLocalDevelopmentFallback() {
        try (ConfigurableApplicationContext context = start("local")) {
            JwtProperties properties = context.getBean(JwtProperties.class);
            assertThat(properties.secret()).isEqualTo("replace-this-local-development-secret-with-a-long-random-value");
            assertThat(context.getBean(JwtService.class)).isNotNull();
        }
    }

    private ConfigurableApplicationContext start(String profile, String... properties) {
        String[] applicationProperties = new String[properties.length + 1];
        applicationProperties[0] = "spring.main.banner-mode=off";
        System.arraycopy(properties, 0, applicationProperties, 1, properties.length);
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        SpringApplicationBuilder builder = new SpringApplicationBuilder(JwtOnlyConfiguration.class)
                .web(WebApplicationType.NONE)
                .environment(environment)
                .properties(applicationProperties);
        if (profile != null) {
            builder.profiles(profile);
        }
        return builder.run();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(JwtProperties.class)
    static class JwtOnlyConfiguration {
        @Bean
        JwtService jwtService(JwtProperties properties) {
            return new JwtService(properties);
        }
    }
}
