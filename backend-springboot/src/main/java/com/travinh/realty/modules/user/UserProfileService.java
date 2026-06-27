package com.travinh.realty.modules.user;

import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.dto.BrokerContactResponse;
import com.travinh.realty.modules.user.dto.CreateBrokerRequest;
import com.travinh.realty.modules.user.dto.CurrentUserProfileResponse;
import com.travinh.realty.modules.user.dto.UpdateProfileRequest;
import com.travinh.realty.modules.user.dto.UserProfileResponse;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.model.UserStatus;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserProfileService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public UserProfileService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
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
        user.updateProfile(request.fullName().trim(), phone);
        return CurrentUserProfileResponse.from(user);
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
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        if (users.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already registered");
        }
        try {
            User broker = User.createBroker(username, email, passwordEncoder.encode(request.password()),
                    request.fullName().trim(), request.phone().trim());
            return UserProfileResponse.from(users.save(broker));
        } catch (DataIntegrityViolationException exception) {
            if (UserIdentityConstraints.isDuplicateEmailOrUsername(exception)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email or username is already registered", exception);
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
}
