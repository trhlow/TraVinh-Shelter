UPDATE users
SET password_hash = '$2a$10$trl57/1.k5sAHjJprZkggeLT.GSfjIz9wx9C4ZobtczpgTOo/OfYe',
    status = 'ACTIVE'
WHERE id = '33333333-3333-3333-3333-333333333333'
   OR email = 'admin@congtinland.vn'
   OR username = 'admin@congtinland.vn';
