package com.travinh.realty.common.exception;

import java.time.Instant;
import java.util.Map;

public record ApiError(Instant timestamp, int status, String error, String message,
                       Map<String, String> fieldErrors, String traceId) {
    public ApiError(Instant timestamp, int status, String error, String message,
                    Map<String, String> fieldErrors) {
        this(timestamp, status, error, message, fieldErrors, org.slf4j.MDC.get("traceId"));
    }
}
