package com.travinh.realty.modules.booking;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.viewing")
public record ViewingOtpProperties(boolean otpRequired) {
}
