package com.travinh.realty.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.MultipartProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

class MultipartConfigurationTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withConfiguration(AutoConfigurations.of(ConfigurationPropertiesAutoConfiguration.class))
            .withUserConfiguration(MultipartConfiguration.class);

    @Test
    void applicationConfigBindsMultipartUploadLimits() {
        contextRunner.run(context -> {
            MultipartProperties properties = context.getBean(MultipartProperties.class);

            assertThat(properties.getMaxFileSize()).isEqualTo(DataSize.ofMegabytes(20));
            assertThat(properties.getMaxRequestSize()).isEqualTo(DataSize.ofMegabytes(25));
        });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(MultipartProperties.class)
    static class MultipartConfiguration {
    }
}
