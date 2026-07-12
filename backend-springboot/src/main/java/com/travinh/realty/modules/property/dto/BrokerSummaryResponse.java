package com.travinh.realty.modules.property.dto;

import com.travinh.realty.modules.user.model.User;
import java.util.UUID;

public record BrokerSummaryResponse(UUID id, String fullName, String phone, String avatarUrl, String email,
                                     String facebookUrl, String tiktokUrl) {
    public static BrokerSummaryResponse from(User broker) {
        return new BrokerSummaryResponse(broker.getId(), broker.getFullName(), broker.getPhone(),
                broker.getAvatarUrl(), broker.getEmail(), broker.getFacebookUrl(),
                broker.getTiktokUrl());
    }
}
