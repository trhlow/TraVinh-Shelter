UPDATE users
SET email = 'broker@congtinland.vn'
WHERE email = 'broker@travinhrealty.vn'
  AND NOT EXISTS (
      SELECT 1 FROM users existing
      WHERE existing.email = 'broker@congtinland.vn'
  );
