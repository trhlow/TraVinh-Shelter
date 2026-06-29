CREATE TABLE viewing_appointments (
    id UUID PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_label VARCHAR(100),
    visitor_name VARCHAR(150) NOT NULL,
    visitor_phone VARCHAR(30) NOT NULL,
    note TEXT,
    expected_move_in VARCHAR(50),
    occupants INTEGER,
    vehicles INTEGER,
    pets BOOLEAN,
    requested_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_viewing_appointments_property_id ON viewing_appointments (property_id);
CREATE INDEX idx_viewing_appointments_created ON viewing_appointments (created_at DESC);
