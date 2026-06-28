package com.travinh.realty.modules.user;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;

public final class UserIdentityConstraints {
    private UserIdentityConstraints() {
    }

    public static boolean isDuplicateEmailOrUsername(DataIntegrityViolationException exception) {
        Throwable cause = exception;
        while (cause != null) {
            if (cause instanceof ConstraintViolationException violation) {
                String constraintName = violation.getConstraintName();
                return "users_email_key".equals(constraintName) || "users_username_key".equals(constraintName);
            }
            cause = cause.getCause();
        }
        return false;
    }

    public static boolean isDuplicatePhone(DataIntegrityViolationException exception) {
        Throwable cause = exception;
        while (cause != null) {
            if (cause instanceof ConstraintViolationException violation) {
                String constraintName = violation.getConstraintName();
                return "users_phone_normalized_unique".equals(constraintName);
            }
            cause = cause.getCause();
        }
        return false;
    }
}
