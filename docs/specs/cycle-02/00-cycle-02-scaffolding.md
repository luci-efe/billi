# Spec: Cycle 02 Scaffolding & Database Foundation

**ID:** BIL-00-C2-SCAFFOLD
**Status:** Draft
**Scope:** Foundation for Cycle 02 (Profile, Transactions, Dashboard)

## 1. Goal
Initialize the production/staging Turso database with the current schema and extend it to support user profiles, custom categories, and currency preferences.

## 2. Technical Context
- **Stack:** Turso (libSQL), Drizzle ORM, Hono (API), Clerk (Auth).
- **Current State:** `packages/db/migrations` has `0001_users.sql` and `0002_transactions.sql`, but the Turso DB is empty.

## 3. Implementation Steps

### Phase A: DB Initialization
- [ ] Ensure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set in CI/CD and local `.env` files.
- [ ] Execute `bun run migrate` in `packages/db` to sync current schema.
- [ ] Verify connectivity with a health-check script.

### Phase B: Schema Extensions (RFC & Preferences)
Modify `packages/db/src/schema/users.ts` or add `packages/db/src/schema/user_profiles.ts`:
- **RFC:** `text('rfc')` (length 13).
- **Default Currency:** `text('default_currency').default('MXN')`.
- **Custom Categories:** This might be a separate table `user_categories` or a JSON field in `users` (SQLite supports JSON). 
  - *Decision:* Use a separate table `categories` with `owner_id` to allow full CRUD.

### Phase C: API Updates
- [ ] Update `/api/me` to return the full profile.
- [ ] Add `PATCH /api/me` to update RFC and preferences.

## 4. Acceptance Criteria
- [ ] `bun run migrate` runs successfully against a live Turso instance.
- [ ] The `users` table contains `rfc` and `default_currency`.
- [ ] A new `categories` table exists.
- [ ] `/api/me` returns 200 with the new fields (even if null).
