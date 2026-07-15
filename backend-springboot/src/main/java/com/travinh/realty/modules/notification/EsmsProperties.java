package com.travinh.realty.modules.notification;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "esms")
public record EsmsProperties(String apiKey, String secretKey, String apiUrl, String brandname, String smsType) {
    @Override
    public String toString() {
        return "EsmsProperties[apiKey=REDACTED, secretKey=REDACTED, apiUrl=" + apiUrl
                + ", brandname=" + brandname + ", smsType=" + smsType + "]";
    }
}
