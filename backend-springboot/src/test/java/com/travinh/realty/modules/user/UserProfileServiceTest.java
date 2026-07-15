package com.travinh.realty.modules.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.infrastructure.storage.LocalMediaStorage;
import com.travinh.realty.modules.user.dto.ChangePasswordRequest;
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
    @Mock private LocalMediaStorage storage;
    @Mock private JwtService jwt;

    @Test
    void updatesOwnUserProfile() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "Old name", null);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        UserProfileService service = service();

        CurrentUserProfileResponse response = service.updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("New name", "0900000000", null, null));

        assertThat(response.fullName()).isEqualTo("New name");
        assertThat(response.phone()).isEqualTo("0900000000");
    }

    @Test
    void updatesOwnUserProfileIncludingSocialLinks() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "Old name", null);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        CurrentUserProfileResponse response = service().updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("Old name", "0900000000",
                        "https://facebook.com/user", "https://tiktok.com/@user"));

        assertThat(response.facebookUrl()).isEqualTo("https://facebook.com/user");
        assertThat(response.tiktokUrl()).isEqualTo("https://tiktok.com/@user");
    }

    @Test
    void clearingSocialLinksWithBlankOrNullStoresNull() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "User", null);
        ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/existing");
        ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@existing");
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        for (String blank : new String[]{null, "", "   "}) {
            CurrentUserProfileResponse response = service().updateCurrentProfile(UserPrincipal.from(user),
                    new UpdateProfileRequest("User", "0900000000", blank, blank));

            assertThat(response.facebookUrl()).isNull();
            assertThat(response.tiktokUrl()).isNull();
            assertThat(user.getFacebookUrl()).isNull();
            assertThat(user.getTiktokUrl()).isNull();
        }
    }

    @Test
    void brokerCannotRemoveRequiredPhoneNumber() {
        User broker = user(UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));

        assertThatThrownBy(() -> service().updateCurrentProfile(UserPrincipal.from(broker),
                new UpdateProfileRequest("Broker", "  ", null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
    }

    @Test
    void profileUpdateRejectsDuplicatePhone() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(users.existsByNormalizedPhoneAndIdNot("0911111111", user.getId())).thenReturn(true);

        assertThatThrownBy(() -> service().updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("User", "0911 111 111", null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
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

    @Test
    void adminCreateBrokerRejectsDuplicatePhone() {
        when(users.existsByEmail("broker@example.com")).thenReturn(false);
        when(users.existsByUsername("broker.one")).thenReturn(false);
        when(users.existsByNormalizedPhone("0900000000")).thenReturn(true);

        assertThatThrownBy(() -> service().createBroker(new CreateBrokerRequest(
                "broker.one", "BROKER@example.com", "correct-horse-battery-staple", "Broker One", "0900 000 000")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void changePasswordSucceedsAndUpdatesStoredHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
        String originalHash = encoder.encode("old-password");
        User user = user(UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        ReflectionTestUtils.setField(user, "passwordHash", originalHash);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        service().changePassword(UserPrincipal.from(user),
                new ChangePasswordRequest("old-password", "new-password-secure"), "current-jwt-token");

        String updatedHash = (String) ReflectionTestUtils.getField(user, "passwordHash");
        assertThat(updatedHash).isNotEqualTo(originalHash);
        assertThat(encoder.matches("new-password-secure", updatedHash)).isTrue();
        org.mockito.Mockito.verify(jwt).revoke("current-jwt-token");
    }

    @Test
    void changePasswordRejectsWrongCurrentPassword() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
        User user = user(UserRole.USER, UserStatus.ACTIVE, "User", null);
        ReflectionTestUtils.setField(user, "passwordHash", encoder.encode("correct-password"));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service().changePassword(UserPrincipal.from(user),
                new ChangePasswordRequest("wrong-password", "new-password-secure"), "current-jwt-token"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void cannotLockAnAdminAccount() {
        User admin = user(UserRole.USER, UserStatus.ACTIVE, "Admin", "0900000000");
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        when(users.findById(admin.getId())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service().updateUserStatus(admin.getId(), UserStatus.LOCKED))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
        assertThat(admin.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void canUnlockAnAdminAccount() {
        User admin = user(UserRole.USER, UserStatus.ACTIVE, "Admin", "0900000000");
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        ReflectionTestUtils.setField(admin, "status", UserStatus.LOCKED);
        when(users.findById(admin.getId())).thenReturn(Optional.of(admin));

        UserProfileResponse response = service().updateUserStatus(admin.getId(), UserStatus.ACTIVE);

        assertThat(response.status()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void canLockANonAdminAccount() {
        User broker = user(UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));

        UserProfileResponse response = service().updateUserStatus(broker.getId(), UserStatus.LOCKED);

        assertThat(response.status()).isEqualTo(UserStatus.LOCKED);
    }

    @Test
    void deleteCurrentUserAnonymizesRedactedFieldsAndPreservesIdRoleCreatedAt() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "Old name", "0900000000");
        java.time.Instant createdAt = java.time.Instant.parse("2024-01-01T00:00:00Z");
        java.time.Instant originalPasswordChangedAt = user.getPasswordChangedAt();
        ReflectionTestUtils.setField(user, "createdAt", createdAt);
        ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/user");
        ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@user");
        ReflectionTestUtils.setField(user, "avatarUrl", "https://cdn.example.com/avatar.jpg");
        UUID id = user.getId();
        UserRole role = user.getRole();
        when(users.findById(id)).thenReturn(Optional.of(user));

        service().deleteCurrentUser(UserPrincipal.from(user));

        assertThat(user.getId()).isEqualTo(id);
        assertThat(user.getRole()).isEqualTo(role);
        assertThat(user.getCreatedAt()).isEqualTo(createdAt);
        assertThat(user.getFullName()).isEqualTo("Người dùng đã xoá");
        assertThat(user.getPhone()).isNull();
        assertThat(user.getAvatarUrl()).isNull();
        assertThat(user.getFacebookUrl()).isNull();
        assertThat(user.getTiktokUrl()).isNull();
        assertThat(user.getEmail()).isEqualTo("deleted-" + id + "@congtinland.local");
        assertThat(user.getUsername()).isEqualTo("deleted-" + id);
        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(user.getPasswordChangedAt()).isAfterOrEqualTo(originalPasswordChangedAt);
    }

    @Test
    void sequentialDeletesOfDifferentUsersProduceUniquePlaceholdersWithoutCollision() {
        User first = user(UserRole.USER, UserStatus.ACTIVE, "User One", "0900000001");
        User second = user(UserRole.BROKER, UserStatus.ACTIVE, "User Two", "0900000002");
        when(users.findById(first.getId())).thenReturn(Optional.of(first));
        when(users.findById(second.getId())).thenReturn(Optional.of(second));

        service().deleteCurrentUser(UserPrincipal.from(first));
        service().deleteCurrentUser(UserPrincipal.from(second));

        assertThat(first.getEmail()).isNotEqualTo(second.getEmail());
        assertThat(first.getUsername()).isNotEqualTo(second.getUsername());
        assertThat(first.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(second.getStatus()).isEqualTo(UserStatus.DELETED);
    }

    private UserProfileService service() {
        return new UserProfileService(users, new BCryptPasswordEncoder(4), storage, jwt);
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
