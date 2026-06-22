package com.travinh.realty.modules.user.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class SavedPropertyId implements Serializable {

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "property_id")
    private UUID propertyId;

    protected SavedPropertyId() {
    }

    public SavedPropertyId(UUID userId, UUID propertyId) {
        this.userId = userId;
        this.propertyId = propertyId;
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) return true;
        if (!(object instanceof SavedPropertyId that)) return false;
        return Objects.equals(userId, that.userId) && Objects.equals(propertyId, that.propertyId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, propertyId);
    }
}
