package com.travinh.realty.modules.booking;

import com.travinh.realty.modules.booking.model.AppointmentStatus;
import com.travinh.realty.modules.booking.model.ViewingAppointment;
import org.springframework.data.jpa.domain.Specification;

/**
 * Reusable {@link Specification} fragments for admin viewing-appointment listing filters.
 * Each fragment returns {@code null} when its input is absent so callers can chain them
 * with {@code Specification.where(...).and(...)} and skip inactive filters.
 */
public final class ViewingSpecifications {
    private ViewingSpecifications() {
    }

    public static Specification<ViewingAppointment> hasStatus(AppointmentStatus status) {
        if (status == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<ViewingAppointment> matchesQuery(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String like = "%" + text.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("visitorName")), like),
                cb.like(cb.lower(root.get("visitorPhone")), like));
    }
}
