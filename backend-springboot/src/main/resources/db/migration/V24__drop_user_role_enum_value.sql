-- The self-registered "USER" actor was removed from the product in Pass 3 (no /auth/register
-- endpoint, no frontend register/profile routes for it): the only account-creation path left is
-- AdminBrokerController -> User.createBroker(), which always sets role=BROKER. USER has been
-- unreachable ever since, kept only as DB/Java debt.
--
-- Postgres does not support ALTER TYPE ... DROP VALUE, so removing it requires recreating the
-- enum type: rename the old type out of the way, create a new one without USER, repoint the
-- users.role column at it (dropping the now-meaningless DEFAULT 'USER' at the same time, since
-- application code always sets role explicitly), then drop the old type.
--
-- Guard first: fail loudly instead of silently corrupting data if some out-of-band row still has
-- role=USER (none did as of this migration, verified against the running dev database).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE role = 'USER') THEN
    RAISE EXCEPTION 'Cannot drop USER from user_role enum: % row(s) still have role=USER',
      (SELECT count(*) FROM users WHERE role = 'USER');
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM ('BROKER', 'ADMIN');

ALTER TABLE users
  ALTER COLUMN role TYPE user_role USING role::text::user_role;

DROP TYPE user_role_old;
