package com.travinh.realty.modules.user.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(length = 30)
    private String phone;

    @Column(name = "avatar_url", length = 2048)
    private String avatarUrl;

    @Column(name = "facebook_url", length = 2048)
    private String facebookUrl;

    @Column(name = "tiktok_url", length = 2048)
    private String tiktokUrl;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "user_role")
    private UserRole role = UserRole.BROKER;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "user_status")
    private UserStatus status = UserStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "password_changed_at", nullable = false)
    private Instant passwordChangedAt;

    protected User() {
    }

    public static User register(String username, String email, String passwordHash,
                                String fullName, String phone) {
        User user = new User();
        user.username = username;
        user.email = email;
        user.passwordHash = passwordHash;
        user.fullName = fullName;
        user.phone = phone;
        user.role = UserRole.BROKER;
        user.status = UserStatus.ACTIVE;
        user.passwordChangedAt = Instant.now();
        return user;
    }

    public static User createBroker(String username, String email, String passwordHash,
                                    String fullName, String phone) {
        User user = register(username, email, passwordHash, fullName, phone);
        user.role = UserRole.BROKER;
        return user;
    }

    public void updateProfile(String fullName, String phone, String facebookUrl, String tiktokUrl) {
        this.fullName = fullName;
        this.phone = phone;
        this.facebookUrl = facebookUrl;
        this.tiktokUrl = tiktokUrl;
    }

    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
        this.passwordChangedAt = Instant.now();
    }

    public void upgradePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void updateAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public void updateStatus(UserStatus status) {
        this.status = status;
    }

    public void anonymize() {
        this.fullName = "Người dùng đã xoá";
        this.phone = null;
        this.avatarUrl = null;
        this.facebookUrl = null;
        this.tiktokUrl = null;
        this.email = "deleted-" + id + "@congtinland.local";
        this.username = "deleted-" + id;
        this.status = UserStatus.DELETED;
        this.passwordChangedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getFullName() { return fullName; }
    public String getPhone() { return phone; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getFacebookUrl() { return facebookUrl; }
    public String getTiktokUrl() { return tiktokUrl; }
    public String getEmail() { return email; }
    public UserRole getRole() { return role; }
    public UserStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getPasswordChangedAt() { return passwordChangedAt; }
}
