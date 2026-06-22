package com.travinh.realty.modules.user.model;

import com.travinh.realty.modules.property.model.Property;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import jakarta.persistence.Column;

@Entity
@Table(name = "saved_properties")
public class SavedProperty {

    @EmbeddedId
    private SavedPropertyId id;

    @MapsId("userId")
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @MapsId("propertyId")
    @ManyToOne(optional = false)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @CreationTimestamp
    @Column(name = "saved_at", nullable = false, updatable = false)
    private Instant savedAt;

    protected SavedProperty() {
    }

    public SavedPropertyId getId() { return id; }
    public User getUser() { return user; }
    public Property getProperty() { return property; }
    public Instant getSavedAt() { return savedAt; }
}
