package com.travinh.realty.modules.user;

import static org.assertj.core.api.Assertions.assertThat;

import com.travinh.realty.modules.user.dto.CreateBrokerRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class CreateBrokerRequestValidationTest {

    private final Validator validator;

    CreateBrokerRequestValidationTest() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    private CreateBrokerRequest requestWithPhone(String phone) {
        return new CreateBrokerRequest("broker.one", "broker@example.com", "correct-horse-battery-staple",
                "Broker One", phone);
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "123", "0123456789", "091234567", "09123456789", "abcdefghij", ""})
    void rejectsInvalidPhoneFormats(String phone) {
        Set<ConstraintViolation<CreateBrokerRequest>> violations = validator.validate(requestWithPhone(phone));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("phone"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0912345678", "0987654321", "0765432109", "0812345678", "0325678901"})
    void acceptsValidVietnameseMobileNumbers(String phone) {
        Set<ConstraintViolation<CreateBrokerRequest>> violations = validator.validate(requestWithPhone(phone));
        assertThat(violations).noneMatch(v -> v.getPropertyPath().toString().equals("phone"));
    }

    @Test
    void usernameWithInvalidCharactersReturnsVietnameseMessage() {
        Set<ConstraintViolation<CreateBrokerRequest>> violations = validator.validate(new CreateBrokerRequest(
                "bad username!", "broker@example.com", "password123", "Tên Môi Giới", "0900000000"));

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("username");
        assertThat(violations.stream()
                .filter(v -> v.getPropertyPath().toString().equals("username"))
                .findFirst().orElseThrow().getMessage())
                .isEqualTo("Tên đăng nhập chỉ được chứa chữ, số và các ký tự _.-");
    }
}
