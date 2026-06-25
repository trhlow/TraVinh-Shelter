package com.travinh.realty.common.config;

import com.travinh.realty.infrastructure.storage.LocalMediaStorage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticMediaConfig implements WebMvcConfigurer {
    private final ObjectProvider<LocalMediaStorage> storage;

    public StaticMediaConfig(ObjectProvider<LocalMediaStorage> storage) {
        this.storage = storage;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        LocalMediaStorage localStorage = storage.getIfAvailable();
        if (localStorage == null) {
            return;
        }
        registry.addResourceHandler("/media/**")
                .addResourceLocations(localStorage.storageRoot().toUri().toString());
    }
}
