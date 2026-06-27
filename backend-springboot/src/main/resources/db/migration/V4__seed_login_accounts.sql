UPDATE users
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE email = 'broker@travinhrealty.vn';

UPDATE properties
SET attributes = attributes || '{"ward": "phuong-7", "transaction": "sale", "houseType": "lau"}'::jsonb
WHERE id = '22222222-2222-2222-2222-222222222221';

UPDATE properties
SET attributes = attributes || '{"ward": "cau-ngang", "transaction": "sale"}'::jsonb
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE properties
SET attributes = attributes || '{"ward": "phuong-6", "transaction": "rent"}'::jsonb
WHERE id = '22222222-2222-2222-2222-222222222223';

INSERT INTO users (id, username, password_hash, full_name, phone, email, role, status)
VALUES
    (
        '33333333-3333-3333-3333-333333333333',
        'demo-admin',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Quản trị Trà Vinh',
        '0294 399 9888',
        'admin@travinhrealty.vn',
        'ADMIN',
        'ACTIVE'
    )
ON CONFLICT (id) DO NOTHING;
