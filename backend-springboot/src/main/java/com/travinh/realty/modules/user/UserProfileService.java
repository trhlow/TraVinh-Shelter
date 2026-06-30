package com.travinh.realty.modules.user;

import com.travinh.realty.infrastructure.storage.LocalMediaStorage;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.dto.BrokerContactResponse;
import com.travinh.realty.modules.user.dto.ChangePasswordRequest;
import com.travinh.realty.modules.user.dto.CreateBrokerRequest;
import com.travinh.realty.modules.user.dto.CurrentUserProfileResponse;
import com.travinh.realty.modules.user.dto.UpdateProfileRequest;
import com.travinh.realty.modules.user.dto.UserProfileResponse;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserProfileService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final LocalMediaStorage storage;

    public UserProfileService(UserRepository users, PasswordEncoder passwordEncoder, LocalMediaStorage storage) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public CurrentUserProfileResponse currentProfile(UserPrincipal principal) {
        return CurrentUserProfileResponse.from(findUser(principal.id()));
    }

    @Transactional
    public CurrentUserProfileResponse updateCurrentProfile(UserPrincipal principal, UpdateProfileRequest request) {
        User user = findUser(principal.id());
        String phone = normalizeOptional(request.phone());
        if (user.getRole() == UserRole.BROKER && phone == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Broker profile requires a phone number");
        }
        if (phone != null && users.existsByNormalizedPhoneAndIdNot(normalizePhoneForLookup(phone), user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered");
        }
        try {
            user.updateProfile(request.fullName().trim(), phone);
            users.flush();
            return CurrentUserProfileResponse.from(user);
        } catch (DataIntegrityViolationException exception) {
            if (UserIdentityConstraints.isDuplicatePhone(exception)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered", exception);
            }
            throw exception;
        }
    }

    @Transactional
    public CurrentUserProfileResponse uploadAvatar(UserPrincipal principal, MultipartFile file) {
        User user = findUser(principal.id());
        String previousAvatarUrl = user.getAvatarUrl();
        String avatarUrl = storage.storeUserAvatar(user.getId(), file);
        user.updateAvatarUrl(avatarUrl);
        storage.deleteIfLocal(previousAvatarUrl);
        return CurrentUserProfileResponse.from(user);
    }

    @Transactional
    public void changePassword(UserPrincipal principal, ChangePasswordRequest request) {
        User user = findUser(principal.id());
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        user.updatePasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    @Transactional(readOnly = true)
    public BrokerContactResponse brokerContact(UUID brokerId) {
        User broker = findUser(brokerId);
        if (broker.getRole() != UserRole.BROKER || broker.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Broker not found");
        }
        return BrokerContactResponse.from(broker);
    }

    @Transactional
    public UserProfileResponse createBroker(CreateBrokerRequest request) {
        String email = request.email().trim().toLowerCase();
        String username = request.username().trim();
        String phone = request.phone().trim();
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        if (users.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already registered");
        }
        if (users.existsByNormalizedPhone(normalizePhoneForLookup(phone))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered");
        }
        try {
            User broker = User.createBroker(username, email, passwordEncoder.encode(request.password()),
                    request.fullName().trim(), phone);
            User saved = users.save(broker);
            users.flush();
            return UserProfileResponse.from(saved);
        } catch (DataIntegrityViolationException exception) {
            if (UserIdentityConstraints.isDuplicateEmailOrUsername(exception)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email or username is already registered", exception);
            }
            if (UserIdentityConstraints.isDuplicatePhone(exception)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered", exception);
            }
            throw exception;
        }
    }

    @Transactional
    public UserProfileResponse updateUserStatus(UUID userId, UserStatus status) {
        User user = findUser(userId);
        user.updateStatus(status);
        return UserProfileResponse.from(user);
    }

    @Transactional(readOnly = true)
    public Page<UserProfileResponse> listUsers(Pageable pageable) {
        return users.findAll(pageable).map(UserProfileResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<UserProfileResponse> listBrokers(Pageable pageable) {
        return users.findByRole(UserRole.BROKER, pageable).map(UserProfileResponse::from);
    }

    private User findUser(UUID userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizePhoneForLookup(String value) {
        return value.replaceAll("\\s+", "");
    }
}
