package com.travinh.realty.modules.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.dto.CreateBrokerRequest;
import com.travinh.realty.modules.user.dto.UpdateProfileRequest;
import com.travinh.realty.modules.user.dto.CurrentUserProfileResponse;
import com.travinh.realty.modules.user.dto.UserProfileResponse;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock private UserRepository users;

    @Test
    void updatesOwnUserProfile() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "Old name", null);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        UserProfileService service = service();

        CurrentUserProfileResponse response = service.updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("New name", "0900000000"));

        assertThat(response.fullName()).isEqualTo("New name");
        assertThat(response.phone()).isEqualTo("0900000000");
    }

    @Test
    void brokerCannotRemoveRequiredPhoneNumber() {
        User broker = user(UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));

        assertThatThrownBy(() -> service().updateCurrentProfile(UserPrincipal.from(broker),
                new UpdateProfileRequest("Broker", "  ")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void adminCreatedBrokerAlwaysHasBrokerRoleAndEncryptedPassword() {
        when(users.existsByEmail("broker@example.com")).thenReturn(false);
        when(users.existsByUsername("broker.one")).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfileResponse response = service().createBroker(new CreateBrokerRequest(
                "broker.one", "BROKER@example.com", "correct-horse-battery-staple", "Broker One", "0900000000"));

        assertThat(response.role()).isEqualTo(UserRole.BROKER);
        assertThat(response.email()).isEqualTo("broker@example.com");
    }

    private UserProfileService service() {
        return new UserProfileService(users, new BCryptPasswordEncoder(4));
    }

    private User user(UserRole role, UserStatus status, String fullName, String phone) {
        User user = role == UserRole.BROKER
                ? User.createBroker("broker", "broker@example.com", "hash", fullName, phone)
                : User.register("user", "user@example.com", "hash", fullName, phone);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "status", status);
        return user;
    }
}
