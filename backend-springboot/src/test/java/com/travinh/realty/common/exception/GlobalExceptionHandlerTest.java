package com.travinh.realty.common.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void malformedRequestBodyReturnsBadRequestInsteadOfServerError() {
        HttpInputMessage emptyInputMessage = new HttpInputMessage() {
            @Override public InputStream getBody() { return new ByteArrayInputStream(new byte[0]); }
            @Override public HttpHeaders getHeaders() { return new HttpHeaders(); }
        };
        var exception = new HttpMessageNotReadableException("malformed JSON", emptyInputMessage);

        var response = handler.handleMalformedRequestBody(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().status()).isEqualTo(400);
    }

    @Test
    void unknownRouteReturnsNotFoundInsteadOfServerError() {
        var exception = new NoResourceFoundException(HttpMethod.GET, "brokers", "No static resource brokers.");

        var response = handler.handleNoResourceFound(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().status()).isEqualTo(404);
    }

    @Test
    void genuinelyUnexpectedExceptionsStillReturnServerError() {
        var response = handler.handleUnexpected(new IllegalStateException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().status()).isEqualTo(500);
    }
}
