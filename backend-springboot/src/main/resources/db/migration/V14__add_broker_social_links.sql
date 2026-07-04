ALTER TABLE users ADD COLUMN zalo_url VARCHAR(2048);
ALTER TABLE users ADD COLUMN facebook_url VARCHAR(2048);

UPDATE users
SET zalo_url = 'https://zalo.me/84912345678',
    facebook_url = 'https://facebook.com/congtinland.broker'
WHERE email = 'broker@congtinland.vn';
