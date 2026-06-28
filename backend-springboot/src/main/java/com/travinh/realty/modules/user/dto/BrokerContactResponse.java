package com.travinh.realty.modules.user.dto;

import com.travinh.realty.modules.user.model.User;
import java.util.UUID;

public record BrokerContactResponse(UUID id, String fullName, String phone, String avatarUrl, String email) {
    public static BrokerContactResponse from(User user) {
        return new BrokerContactResponse(user.getId(), user.getFullName(), user.getPhone(), user.getAvatarUrl(),
                user.getEmail());
    }
}
