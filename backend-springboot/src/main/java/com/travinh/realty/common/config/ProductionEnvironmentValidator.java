package com.travinh.realty.common.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class ProductionEnvironmentValidator implements ApplicationRunner {
    private static final List<String> REQUIRED_PRODUCTION_PROPERTIES = List.of(
            "spring.datasource.url",
            "spring.datasource.username",
            "spring.datasource.password",
            "app.jwt.secret",
            "app.cors.allowed-origins");

    private final Environment environment;

    public ProductionEnvironmentValidator(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isStrictProfileActive()) {
            return;
        }
        List<String> missing = REQUIRED_PRODUCTION_PROPERTIES.stream()
                .filter(name -> isBlank(environment.getProperty(name)))
                .toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Missing required production environment properties: "
                    + String.join(", ", missing));
        }
    }

    private boolean isStrictProfileActive() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> profile.equals("prod") || profile.equals("staging"));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
