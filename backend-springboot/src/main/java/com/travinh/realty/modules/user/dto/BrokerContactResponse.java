package com.travinh.realty.modules.user.dto;

import com.travinh.realty.modules.user.model.User;
import java.util.UUID;

public record BrokerContactResponse(UUID id, String fullName, String phone, String avatarUrl, String email,
                                     String facebookUrl, String tiktokUrl) {
    public static BrokerContactResponse from(User user) {
        return new BrokerContactResponse(user.getId(), user.getFullName(), user.getPhone(), user.getAvatarUrl(),
                user.getEmail(), user.getFacebookUrl(), user.getTiktokUrl());
    }
}
