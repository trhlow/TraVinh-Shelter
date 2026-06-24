package com.travinh.realty.modules.user.repository;

import com.travinh.realty.modules.user.model.User;
import java.util.Optional;
import java.util.UUID;
import com.travinh.realty.modules.user.model.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    Page<User> findByRole(UserRole role, Pageable pageable);
}
