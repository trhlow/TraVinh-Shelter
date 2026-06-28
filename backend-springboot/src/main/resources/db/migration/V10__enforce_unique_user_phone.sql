WITH duplicate_phones AS (
    SELECT
        id,
        phone,
        role,
        row_number() OVER (
            PARTITION BY regexp_replace(phone, '\s+', '', 'g')
            ORDER BY
                CASE role WHEN 'BROKER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END,
                created_at,
                id
        ) AS duplicate_rank
    FROM users
    WHERE phone IS NOT NULL AND btrim(phone) <> ''
)
UPDATE users
SET phone = CASE
    WHEN duplicate_phones.role = 'USER' THEN NULL
    ELSE left(users.phone || '-dup' || duplicate_phones.duplicate_rank, 30)
END
FROM duplicate_phones
WHERE users.id = duplicate_phones.id
  AND duplicate_phones.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_normalized_unique
ON users ((regexp_replace(phone, '\s+', '', 'g')))
WHERE phone IS NOT NULL AND btrim(phone) <> '';
