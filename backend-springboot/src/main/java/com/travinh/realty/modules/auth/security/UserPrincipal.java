package com.travinh.realty.modules.auth.security;

import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserStatus;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record UserPrincipal(UUID id, String email, String passwordHash, UserStatus status,
                            Collection<? extends GrantedAuthority> authorities) implements UserDetails {
    public static UserPrincipal from(User user) {
        return new UserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), user.getStatus(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }
    @Override public String getUsername() { return email; }
    @Override public String getPassword() { return passwordHash; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public boolean isEnabled() { return status == UserStatus.ACTIVE; }
}
