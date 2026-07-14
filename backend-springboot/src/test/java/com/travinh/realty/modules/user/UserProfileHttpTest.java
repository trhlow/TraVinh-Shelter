package com.travinh.realty.modules.user;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.common.config.SecurityConfig;
import com.travinh.realty.common.exception.GlobalExceptionHandler;
import com.travinh.realty.modules.admin.AdminBrokerController;
import com.travinh.realty.modules.admin.AuditService;
import com.travinh.realty.modules.auth.security.JpaUserDetailsService;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.infrastructure.storage.LocalMediaStorage;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {UserProfileController.class, AdminBrokerController.class})
@Import({SecurityConfig.class, JwtService.class, GlobalExceptionHandler.class,
        UserProfileService.class, UserProfileHttpTest.JwtTestConfiguration.class})
class UserProfileHttpTest {

    private static final String SECRET = "a-development-secret-that-is-at-least-thirty-two-characters-long";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @MockitoBean private UserRepository users;
    @MockitoBean private LocalMediaStorage storage;
    @MockitoBean private AuditService audit;
    @MockitoBean private JpaUserDetailsService userDetailsService;
    @MockitoBean private JpaMetamodelMappingContext jpaMappingContext;

    @Test
    void currentProfileUsesAuthenticatedPrincipalAndHidesInternalFields() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        mockMvc.perform(get("/users/me").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId().toString()))
                .andExpect(jsonPath("$.email").value("user@example.com"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void anonymousAndLockedUsersReceiveApiErrorUnauthorized() throws Exception {
        mockMvc.perform(get("/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.fieldErrors").isMap());

        User locked = user("locked@example.com", UserRole.USER, UserStatus.LOCKED, "Locked", "0900000000");
        authenticate(locked);
        mockMvc.perform(get("/users/me").header("Authorization", bearer(locked)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void profileUpdateOnlyChangesWhitelistedFields() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "Old", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"fullName":"New Name","phone":"0911111111","role":"ADMIN","status":"LOCKED","passwordHash":"leak"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("New Name"))
                .andExpect(jsonPath("$.phone").value("0911111111"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        org.assertj.core.api.Assertions.assertThat(user.getRole()).isEqualTo(UserRole.USER);
        org.assertj.core.api.Assertions.assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void brokerCannotRemovePhoneAndRegularUserCanClearItThroughEveryNullablePayloadForm() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        for (String payload : new String[]{"{\"fullName\":\"Broker\",\"phone\":null}", "{\"fullName\":\"Broker\",\"phone\":\"\"}", "{\"fullName\":\"Broker\",\"phone\":\"   \"}", "{\"fullName\":\"Broker\"}"}) {
            mockMvc.perform(patch("/users/me").header("Authorization", bearer(broker))
                            .contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.status").value(422))
                    .andExpect(jsonPath("$.message").value("Hồ sơ môi giới yêu cầu số điện thoại"));
        }

        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        for (String payload : new String[]{"{\"fullName\":\"User\",\"phone\":null}", "{\"fullName\":\"User\",\"phone\":\"\"}", "{\"fullName\":\"User\",\"phone\":\"   \"}", "{\"fullName\":\"User\"}"}) {
            mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                            .contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.phone").doesNotExist());
            org.assertj.core.api.Assertions.assertThat(user.getPhone()).isNull();
        }
    }

    @Test
    void profileUpdateAcceptsAndReturnsSocialLinks() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"fullName":"User","phone":"0900000000","facebookUrl":"https://facebook.com/user","tiktokUrl":"https://tiktok.com/@user"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.facebookUrl").value("https://facebook.com/user"))
                .andExpect(jsonPath("$.tiktokUrl").value("https://tiktok.com/@user"));
    }

    @Test
    void malformedJsonBodyReturnsBadRequestNotServerError() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void profileUpdateRejectsInvalidPhoneFormat() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"fullName":"User","phone":"12345"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.phone").value("phone must be a valid Vietnamese mobile number"));
    }

    @Test
    void profileUpdateRejectsPhoneAlreadyRegisteredToAnotherUser() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(users.existsByNormalizedPhoneAndIdNot("0911111111", user.getId())).thenReturn(true);

        mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"fullName":"User","phone":"0911111111"}
                        """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Số điện thoại đã được đăng ký"));
    }

    @Test
    void profileUpdateMapsDuplicatePhoneRaceToConflict() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(users.existsByNormalizedPhoneAndIdNot("0911111111", user.getId())).thenReturn(false);
        doThrow(new DataIntegrityViolationException("duplicate",
                new ConstraintViolationException("duplicate", new SQLException(), "users_phone_normalized_unique")))
                .when(users).flush();

        mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"fullName":"User","phone":"0911111111"}
                        """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Số điện thoại đã được đăng ký"));
    }

    @Test
    void changePasswordRejectsIncorrectCurrentPassword() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        mockMvc.perform(patch("/users/me/password").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"currentPassword":"wrong-password","newPassword":"new-password-123"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Mật khẩu hiện tại không đúng"));
    }

    @Test
    void adminCreateBrokerRejectsDuplicateEmailUsernameAndPhone() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        authenticate(admin);
        String payload = "{\"username\":\"new.broker\",\"email\":\"new@example.com\",\"password\":\"correct-horse-battery-staple\",\"fullName\":\"New Broker\",\"phone\":\"0911111111\"}";

        when(users.existsByEmail("new@example.com")).thenReturn(true);
        mockMvc.perform(post("/admin/brokers").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email đã được đăng ký"));

        when(users.existsByEmail("new@example.com")).thenReturn(false);
        when(users.existsByUsername("new.broker")).thenReturn(true);
        mockMvc.perform(post("/admin/brokers").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Tên đăng nhập đã được đăng ký"));

        when(users.existsByUsername("new.broker")).thenReturn(false);
        when(users.existsByNormalizedPhone("0911111111")).thenReturn(true);
        mockMvc.perform(post("/admin/brokers").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Số điện thoại đã được đăng ký"));
    }

    @Test
    void adminCreateBrokerMapsDuplicatePhoneRaceToConflict() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        authenticate(admin);
        String payload = "{\"username\":\"new.broker\",\"email\":\"new@example.com\",\"password\":\"correct-horse-battery-staple\",\"fullName\":\"New Broker\",\"phone\":\"0911111111\"}";
        when(users.existsByEmail("new@example.com")).thenReturn(false);
        when(users.existsByUsername("new.broker")).thenReturn(false);
        when(users.existsByNormalizedPhone("0911111111")).thenReturn(false);
        when(users.save(any(User.class))).thenThrow(new DataIntegrityViolationException("duplicate",
                new ConstraintViolationException("duplicate", new SQLException(), "users_phone_normalized_unique")));

        mockMvc.perform(post("/admin/brokers").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Số điện thoại đã được đăng ký"));
    }

    @Test
    void adminCannotLockAnAdminAccount() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        User otherAdmin = user("other-admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Other Admin", "0900000000");
        authenticate(admin);
        when(users.findById(otherAdmin.getId())).thenReturn(Optional.of(otherAdmin));

        mockMvc.perform(patch("/admin/users/{userId}/status", otherAdmin.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LOCKED\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value("Không thể khoá tài khoản quản trị viên"));
    }

    @Test
    void adminUpdateStatusOfMissingUserReturnsNotFound() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        authenticate(admin);
        UUID missingUserId = UUID.randomUUID();
        when(users.findById(missingUserId)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/admin/users/{userId}/status", missingUserId)
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LOCKED\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Không tìm thấy người dùng"));
    }

    @Test
    void regularUserCanClearSocialLinksThroughEveryNullablePayloadForm() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/existing");
        ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@existing");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        for (String payload : new String[]{
                "{\"fullName\":\"User\",\"phone\":\"0900000000\",\"facebookUrl\":null,\"tiktokUrl\":null}",
                "{\"fullName\":\"User\",\"phone\":\"0900000000\",\"facebookUrl\":\"\",\"tiktokUrl\":\"\"}",
                "{\"fullName\":\"User\",\"phone\":\"0900000000\"}"}) {
            mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                            .contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.facebookUrl").doesNotExist())
                    .andExpect(jsonPath("$.tiktokUrl").doesNotExist());
            org.assertj.core.api.Assertions.assertThat(user.getFacebookUrl()).isNull();
            org.assertj.core.api.Assertions.assertThat(user.getTiktokUrl()).isNull();
            ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/existing");
            ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@existing");
        }
    }

    @Test
    void publicBrokerContactOnlyExposesActiveBrokers() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        ReflectionTestUtils.setField(broker, "facebookUrl", "https://facebook.com/broker");
        ReflectionTestUtils.setField(broker, "tiktokUrl", "https://tiktok.com/@broker");
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        mockMvc.perform(get("/brokers/{id}", broker.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("0900000000"))
                .andExpect(jsonPath("$.facebookUrl").value("https://facebook.com/broker"))
                .andExpect(jsonPath("$.tiktokUrl").value("https://tiktok.com/@broker"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.role").doesNotExist())
                .andExpect(jsonPath("$.status").doesNotExist());

        User locked = user("locked@example.com", UserRole.BROKER, UserStatus.LOCKED, "Locked", "0900000000");
        when(users.findById(locked.getId())).thenReturn(Optional.of(locked));
        mockMvc.perform(get("/brokers/{id}", locked.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Không tìm thấy môi giới"));

        User regular = user("regular@example.com", UserRole.USER, UserStatus.ACTIVE, "Regular", "0900000000");
        when(users.findById(regular.getId())).thenReturn(Optional.of(regular));
        mockMvc.perform(get("/brokers/{id}", regular.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy môi giới"));
        mockMvc.perform(get("/brokers/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy người dùng"));
    }

    @Test
    void adminEndpointsEnforceRoleAndHashBrokerPassword() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        String payload = "{\"username\":\"new.broker\",\"email\":\"new@example.com\",\"password\":\"correct-horse-battery-staple\",\"fullName\":\"New Broker\",\"phone\":\"0900000000\"}";

        mockMvc.perform(post("/admin/brokers").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isUnauthorized()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401));
        authenticate(user);
        mockMvc.perform(post("/admin/brokers").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isForbidden()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(403));
        authenticate(broker);
        mockMvc.perform(post("/admin/brokers").header("Authorization", bearer(broker)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isForbidden()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(403));

        authenticate(admin);
        when(users.existsByEmail("new@example.com")).thenReturn(false);
        when(users.existsByUsername("new.broker")).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        mockMvc.perform(post("/admin/brokers").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("BROKER"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        org.assertj.core.api.Assertions.assertThat(passwordEncoder.matches("correct-horse-battery-staple", saved.getValue().getPasswordHash())).isTrue();
    }

    @Test
    void adminCreateBrokerMapsDuplicateRaceToConflictAndLockTakesEffectImmediately() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        authenticate(admin);
        String payload = "{\"username\":\"new.broker\",\"email\":\"new@example.com\",\"password\":\"correct-horse-battery-staple\",\"fullName\":\"New Broker\",\"phone\":\"0900000000\"}";
        when(users.existsByEmail("new@example.com")).thenReturn(false);
        when(users.existsByUsername("new.broker")).thenReturn(false);
        when(users.save(any(User.class))).thenThrow(new DataIntegrityViolationException("duplicate", new ConstraintViolationException("duplicate", new SQLException(), "users_email_key")));
        mockMvc.perform(post("/admin/brokers").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Email hoặc tên đăng nhập đã được đăng ký"));

        User target = user("target@example.com", UserRole.USER, UserStatus.ACTIVE, "Target", "0900000000");
        String targetBearer = bearer(target);
        when(users.findById(target.getId())).thenReturn(Optional.of(target));
        when(userDetailsService.loadUserByUsername(target.getEmail())).thenAnswer(invocation -> UserPrincipal.from(target));
        mockMvc.perform(patch("/admin/users/{id}/status", target.getId()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LOCKED\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("LOCKED"));
        mockMvc.perform(get("/users/me").header("Authorization", targetBearer))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void adminCreateBrokerDoesNotMisclassifyOtherIntegrityErrors() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        authenticate(admin);
        String payload = "{\"username\":\"new.broker\",\"email\":\"new@example.com\",\"password\":\"correct-horse-battery-staple\",\"fullName\":\"New Broker\",\"phone\":\"0900000000\"}";
        when(users.existsByEmail("new@example.com")).thenReturn(false);
        when(users.existsByUsername("new.broker")).thenReturn(false);
        when(users.save(any(User.class))).thenThrow(new DataIntegrityViolationException("check constraint",
                new ConstraintViolationException("check constraint", new SQLException(), "users_phone_check")));

        mockMvc.perform(post("/admin/brokers").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").value("Đã xảy ra lỗi không mong muốn"))
                .andExpect(jsonPath("$.fieldErrors").isMap())
                .andExpect(content().string(not(containsString("Resource already exists"))));
    }

    @Test
    void adminStatusEndpointRequiresAdminRole() throws Exception {
        User target = user("target@example.com", UserRole.USER, UserStatus.ACTIVE, "Target", "0900000000");
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        User admin = user("admin@example.com", UserRole.ADMIN, UserStatus.ACTIVE, "Admin", "0900000000");
        String path = "/admin/users/" + target.getId() + "/status";
        String payload = "{\"status\":\"LOCKED\"}";

        mockMvc.perform(patch(path).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isUnauthorized()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401));
        authenticate(user);
        mockMvc.perform(patch(path).header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isForbidden()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(403));
        authenticate(broker);
        mockMvc.perform(patch(path).header("Authorization", bearer(broker)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isForbidden()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(403));

        authenticate(admin);
        when(users.findById(target.getId())).thenReturn(Optional.of(target));
        mockMvc.perform(patch(path).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("LOCKED"));
    }

    private void authenticate(User user) {
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenAnswer(invocation -> UserPrincipal.from(user));
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private User user(String email, UserRole role, UserStatus status, String fullName, String phone) {
        User user = role == UserRole.BROKER
                ? User.createBroker(email.substring(0, email.indexOf('@')), email, "hash", fullName, phone)
                : User.register(email.substring(0, email.indexOf('@')), email, "hash", fullName, phone);
        if (role == UserRole.ADMIN) {
            ReflectionTestUtils.setField(user, "role", UserRole.ADMIN);
        }
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "status", status);
        return user;
    }

    @TestConfiguration
    static class JwtTestConfiguration {
        @Bean
        JwtProperties jwtProperties() {
            return new JwtProperties(SECRET, 60_000);
        }

        @Bean
        org.springframework.boot.webmvc.test.autoconfigure.MockMvcBuilderCustomizer securityMockMvcCustomizer() {
            return builder -> builder.apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity());
        }
    }
}
