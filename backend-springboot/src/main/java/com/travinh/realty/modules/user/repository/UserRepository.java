package com.travinh.realty.modules.user.repository;

import com.travinh.realty.modules.user.model.User;
import java.util.Optional;
import java.util.UUID;
import com.travinh.realty.modules.user.model.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    @Query(value = """
            select exists(
                select 1
                from users
                where phone is not null
                  and btrim(phone) <> ''
                  and regexp_replace(phone, '\\s+', '', 'g') = :phone
            )
            """, nativeQuery = true)
    boolean existsByNormalizedPhone(@Param("phone") String phone);

    @Query(value = """
            select exists(
                select 1
                from users
                where id <> :userId
                  and phone is not null
                  and btrim(phone) <> ''
                  and regexp_replace(phone, '\\s+', '', 'g') = :phone
            )
            """, nativeQuery = true)
    boolean existsByNormalizedPhoneAndIdNot(@Param("phone") String phone, @Param("userId") UUID userId);

    Page<User> findByRole(UserRole role, Pageable pageable);
}
