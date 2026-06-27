package com.travinh.realty.common.config;

import com.travinh.realty.infrastructure.storage.StorageProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({StorageProperties.class, JwtProperties.class, CorsProperties.class})
public class ApplicationPropertiesConfig {
}
