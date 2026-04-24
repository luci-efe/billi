-- 0001_users.sql — Clerk user-id mirror table (ADR-003).
-- PK matches Clerk's user_2... id. consent_v/at track whether the user has
-- accepted the current consent revision (see BIL-1 spec).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  consent_v INTEGER,
  consent_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users(email) WHERE email <> '';
