package com.travinh.realty.modules.auth.security;

import com.travinh.realty.modules.user.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsPasswordService;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JpaUserDetailsService implements UserDetailsService, UserDetailsPasswordService {
    private final UserRepository userRepository;
    public JpaUserDetailsService(UserRepository userRepository) { this.userRepository = userRepository; }
    @Override
    public UserDetails loadUserByUsername(String email) {
        return userRepository.findByEmail(email).map(UserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password"));
    }
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UserDetails updatePassword(UserDetails user, String newPassword) {
        com.travinh.realty.modules.user.model.User entity = userRepository.findByEmail(user.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password"));
        entity.updatePasswordHash(newPassword);
        userRepository.save(entity);
        return UserPrincipal.from(entity);
    }
}
