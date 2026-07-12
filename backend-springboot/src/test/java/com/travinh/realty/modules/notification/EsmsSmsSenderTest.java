package com.travinh.realty.modules.notification;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

class EsmsSmsSenderTest {
    private static final String API_URL = "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/";
    private static final EsmsProperties PROPERTIES =
            new EsmsProperties("test-api-key", "test-secret-key", API_URL, "", "2");

    @Test
    void sendPostsExpectedFieldsAndSucceedsOnCodeResult100() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.ApiKey").value("test-api-key"))
                .andExpect(jsonPath("$.SecretKey").value("test-secret-key"))
                .andExpect(jsonPath("$.Phone").value("0912345678"))
                .andExpect(jsonPath("$.Content").value("Ma OTP la 123456"))
                .andExpect(jsonPath("$.SmsType").value("2"))
                .andRespond(withSuccess("""
                        {"CodeResult":"100","CountRegenerate":0,"SMSID":"abc"}
                        """, MediaType.APPLICATION_JSON));
        EsmsSmsSender sender = new EsmsSmsSender(builder, PROPERTIES);

        sender.send("0912345678", "Ma OTP la 123456");

        server.verify();
    }

    @Test
    void sendThrows503WhenEsmsReturnsNonSuccessCode() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andRespond(withSuccess("""
                        {"CodeResult":"101","CountRegenerate":0}
                        """, MediaType.APPLICATION_JSON));
        EsmsSmsSender sender = new EsmsSmsSender(builder, PROPERTIES);

        assertThatThrownBy(() -> sender.send("0912345678", "Ma OTP la 123456"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503");
    }

    @Test
    void sendThrows503WhenTheHttpCallFails() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL)).andRespond(withServerError());
        EsmsSmsSender sender = new EsmsSmsSender(builder, PROPERTIES);

        assertThatThrownBy(() -> sender.send("0912345678", "Ma OTP la 123456"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503");
    }
}
