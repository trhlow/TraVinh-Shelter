package com.travinh.realty.modules.user;

import static org.assertj.core.api.Assertions.assertThat;

import com.travinh.realty.modules.user.dto.UserProfileResponse;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserStatus;
import com.travinh.realty.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes")
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class UserProfileServiceFilterIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.4-alpine")
            .withDatabaseName("tv_realty_user_filter_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    private static final String TOKEN = "zzuserfilter";
    private static final PageRequest PAGE = PageRequest.of(0, 50);

    @Autowired private UserProfileService profiles;
    @Autowired private UserRepository users;

    private User brokerActive;
    private User brokerLocked;
    private User plainUser;

    @BeforeEach
    void seed() {
        brokerActive = save(User.createBroker(TOKEN + ".toan", TOKEN + ".toan@example.com",
                "hash", "Zzuserfilter Toan Active", "0900000101"), UserStatus.ACTIVE);
        brokerLocked = save(User.createBroker(TOKEN + ".lan", TOKEN + ".lan@example.com",
                "hash", "Zzuserfilter Lan Locked", "0900000102"), UserStatus.LOCKED);
        plainUser = save(User.register(TOKEN + ".user", TOKEN + ".user@example.com",
                "hash", "Zzuserfilter Plain User", "0900000103"), UserStatus.ACTIVE);
    }

    @Test
    void listBrokersReturnsOnlyBrokersMatchingTheQuery() {
        Page<UserProfileResponse> result = profiles.listBrokers(TOKEN, null, PAGE);

        assertThat(result.getContent()).extracting(UserProfileResponse::id)
                .containsExactlyInAnyOrder(brokerActive.getId(), brokerLocked.getId());
    }

    @Test
    void listBrokersFiltersByStatus() {
        Page<UserProfileResponse> result = profiles.listBrokers(TOKEN, UserStatus.LOCKED, PAGE);

        assertThat(result.getContent()).extracting(UserProfileResponse::id)
                .containsExactly(brokerLocked.getId());
    }

    @Test
    void listBrokersNarrowsByQueryText() {
        Page<UserProfileResponse> result = profiles.listBrokers("toan", null, PAGE);

        assertThat(result.getContent()).extracting(UserProfileResponse::id)
                .containsExactly(brokerActive.getId());
    }

    @Test
    void listUsersSpansAllRolesAndFiltersByStatus() {
        Page<UserProfileResponse> all = profiles.listUsers(TOKEN, null, PAGE);
        assertThat(all.getContent()).extracting(UserProfileResponse::id)
                .containsExactlyInAnyOrder(brokerActive.getId(), brokerLocked.getId(), plainUser.getId());

        Page<UserProfileResponse> active = profiles.listUsers(TOKEN, UserStatus.ACTIVE, PAGE);
        assertThat(active.getContent()).extracting(UserProfileResponse::id)
                .containsExactlyInAnyOrder(brokerActive.getId(), plainUser.getId());
    }

    private User save(User user, UserStatus status) {
        ReflectionTestUtils.setField(user, "status", status);
        return users.save(user);
    }
}
