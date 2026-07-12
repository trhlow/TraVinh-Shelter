package com.travinh.realty.common.config;

import com.travinh.realty.infrastructure.storage.StorageProperties;
import com.travinh.realty.modules.notification.EsmsProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({StorageProperties.class, JwtProperties.class, CorsProperties.class, EsmsProperties.class})
public class ApplicationPropertiesConfig {
}
