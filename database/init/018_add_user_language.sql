ALTER TABLE users
  ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'en';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_language_check;

ALTER TABLE users
  ADD CONSTRAINT users_language_check CHECK (language IN ('en', 'sw'));
