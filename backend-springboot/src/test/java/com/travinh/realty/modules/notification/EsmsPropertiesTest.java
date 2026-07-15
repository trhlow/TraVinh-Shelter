package com.travinh.realty.modules.notification;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EsmsPropertiesTest {

    @Test
    void toStringRedactsApiKeyAndSecretKey() {
        EsmsProperties properties = new EsmsProperties("real-api-key", "real-secret-key",
                "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/", "MyBrand", "2");

        String result = properties.toString();

        assertThat(result).doesNotContain("real-api-key");
        assertThat(result).doesNotContain("real-secret-key");
        assertThat(result).contains("apiUrl=https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/");
        assertThat(result).contains("brandname=MyBrand");
    }
}
