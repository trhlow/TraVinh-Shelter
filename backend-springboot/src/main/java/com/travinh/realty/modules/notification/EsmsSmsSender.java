package com.travinh.realty.modules.notification;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class EsmsSmsSender implements SmsSender {
    private static final Logger log = LoggerFactory.getLogger(EsmsSmsSender.class);
    private static final String SUCCESS_CODE = "100";

    private final RestClient restClient;
    private final EsmsProperties properties;

    public EsmsSmsSender(RestClient.Builder builder, EsmsProperties properties) {
        this.restClient = builder.build();
        this.properties = properties;
    }

    @Override
    public void send(String phone, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ApiKey", properties.apiKey());
        body.put("SecretKey", properties.secretKey());
        body.put("Phone", phone);
        body.put("Content", message);
        body.put("SmsType", properties.smsType());
        body.put("IsUnicode", "1");
        if (properties.brandname() != null && !properties.brandname().isBlank()) {
            body.put("Brandname", properties.brandname());
        }

        Map<String, Object> response;
        try {
            response = restClient.post()
                    .uri(properties.apiUrl())
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {
                    });
        } catch (RuntimeException exception) {
            log.error("eSMS request failed for phone {}", phone, exception);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể gửi SMS lúc này, vui lòng thử lại sau.", exception);
        }

        String codeResult = response == null ? null : String.valueOf(response.get("CodeResult"));
        if (!SUCCESS_CODE.equals(codeResult)) {
            log.error("eSMS rejected message for phone {}: CodeResult={}", phone, codeResult);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể gửi SMS lúc này, vui lòng thử lại sau.");
        }
    }
}
