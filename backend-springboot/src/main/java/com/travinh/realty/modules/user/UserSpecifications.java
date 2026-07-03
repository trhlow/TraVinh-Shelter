package com.travinh.realty.modules.user;

import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import org.springframework.data.jpa.domain.Specification;

/**
 * Reusable {@link Specification} fragments for admin user/broker listing filters.
 * Each fragment returns {@code null} when its input is absent so callers can chain
 * them with {@code Specification.where(...).and(...)} and skip inactive filters.
 */
public final class UserSpecifications {
    private UserSpecifications() {
    }

    public static Specification<User> hasRole(UserRole role) {
        if (role == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("role"), role);
    }

    public static Specification<User> hasStatus(UserStatus status) {
        if (status == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<User> matchesQuery(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String like = "%" + text.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("username")), like),
                cb.like(cb.lower(root.get("email")), like),
                cb.like(cb.lower(root.get("fullName")), like));
    }
}
