ALTER TABLE users ADD COLUMN tiktok_url VARCHAR(2048);

UPDATE users
SET tiktok_url = 'https://tiktok.com/@congtinland.broker'
WHERE email = 'broker@congtinland.vn';
