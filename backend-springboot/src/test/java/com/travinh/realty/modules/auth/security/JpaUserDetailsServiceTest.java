package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JpaUserDetailsServiceTest {

    @Mock private UserRepository userRepository;

    @Test
    void updatePasswordSavesTheNewHashOnTheMatchingUser() {
        User user = User.register("minh", "minh@example.com", "{bcrypt}old-hash", "Minh", "0900000000");
        when(userRepository.findByEmail("minh@example.com")).thenReturn(Optional.of(user));
        JpaUserDetailsService service = new JpaUserDetailsService(userRepository);
        UserPrincipal principal = UserPrincipal.from(user);

        service.updatePassword(principal, "{argon2}new-hash");

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getPasswordHash()).isEqualTo("{argon2}new-hash");
    }
}
