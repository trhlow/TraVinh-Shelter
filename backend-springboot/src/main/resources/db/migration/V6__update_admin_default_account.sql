UPDATE users
SET username = 'admin@congtinland.vn',
    email = 'admin@congtinland.vn',
    password_hash = '$2b$10$y984P4sTah3vVLuiJfQHtOBPkiO2m2aI3NBdzco9tzTwN8ieskMJ.'
WHERE id = '33333333-3333-3333-3333-333333333333'
   OR email IN ('admin@travinhrealty.vn', 'admin@congtinland.vn')
   OR username = 'demo-admin';
