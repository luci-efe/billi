---
id: BIL-2
title: "ST-01-02: Registro e inicio de sesión"
cycle: 1
epic: EP-01
milestone: MS-01
estimate: M (3 points)
priority: Urgent
status: Todo
owner: Fernando
linear_url: https://linear.app/billi/issue/BIL-2
git_branch: bil-2-registro-e-inicio-de-sesion
blocked_by:
  - BIL-1
blocks:
  - BIL-4
  - BIL-18
depends_on_adr:
  - ADR-003
---

# BIL-2 — ST-01-02: Registro e inicio de sesión

## 1. Purpose

Authentication is the precondition for every domain-bearing feature in Billi. Without a verified identity, there is no ownership boundary, no financial data isolation, and no meaningful consent record. This slice establishes Clerk as the identity provider (ADR-003), wires the `<ClerkProvider>` into the React SPA, creates the `/sign-in` and `/sign-up` routes, protects all application routes with signed-in guards, and bootstraps the `users` mirror table in Turso so the Worker can enforce row-level ownership from the very first authenticated request. Everything downstream — transaction capture (BIL-4), dashboard (EP-03), AI assistance (EP-04) — depends on this slice being correct and airtight.

---

## 2. Scope Boundaries

### In scope

- `@clerk/clerk-react` installed and `<ClerkProvider>` wrapping the React app.
- `/sign-in/*` and `/sign-up/*` routes hosting Clerk's pre-built `<SignIn />` and `<SignUp />` components.
- Route-level auth guard: unauthenticated users hitting any route outside `/landing`, `/sign-in/*`, `/sign-up/*` are redirected to `/sign-in`.
- Hono Worker with `clerkMiddleware` and `@hono/clerk-auth`; every `/api/*` request verifies the JWT via Clerk's JWKS endpoint.
- `users` mirror table in Turso (Drizzle schema + migration `0001_users.sql`).
- Upsert pattern on first authenticated request to any `/api/*` endpoint — idempotent, sourced from JWT claims.
- `GET /api/me` returning current user's identity and consent status.
- `POST /api/me/consent` syncing localStorage-held BIL-1 consent data to the `users` row.
- Google OAuth sign-in, configured in the Clerk dashboard.
- Email + password sign-up with Clerk-hosted email verification.
- Secrets matrix wired for dev (`.dev.vars`) and prod (Wrangler secrets + CF Pages env vars).

### Out of scope

- Multi-factor authentication (MFA).
- Password-reset UI — Clerk hosts it; no custom page needed.
- Email template customisation in the Clerk dashboard.
- Role-based access control — MVP is single-role.
- Clerk webhooks for `user.deleted`, `user.updated`, or any user lifecycle event (hardening task, separate story).
- Any UI beyond the auth routes themselves (profile, settings, avatar).
- Rate limiting or bot protection beyond what Clerk provides by default.

---

## 3. Acceptance Criteria

### AC-1 (Linear AC, core)

> Given the user submits valid credentials,  
> When the registration or login form is submitted,  
> Then the system correctly creates or opens the session,  
> And restricts data access by ownership.

### AC-2 — Unauthenticated redirect

> Given an unauthenticated browser session,  
> When the user navigates to `/` (or any protected route),  
> Then the app redirects to `/sign-in` without exposing any financial data.

### AC-3 — Email + password sign-up

> Given the user completes the sign-up form with a valid email and password,  
> When they submit the form,  
> Then Clerk creates the user, dispatches a verification email,  
> And redirects to `/` on successful verification.

### AC-4 — Google OAuth sign-in

> Given Google OAuth is enabled in the Clerk dashboard,  
> When the user clicks "Continue with Google" on `/sign-in`,  
> Then the OAuth flow completes and the user lands on `/` with a valid `__session` cookie, both in dev and prod.

### AC-5 — First `/api/me` upserts `users` row

> Given the user has just signed in for the first time,  
> When the SPA calls `GET /api/me`,  
> Then the Worker upserts a row in `users` (id = Clerk `sub`, email from claims),  
> And returns `{ userId, email, consentAccepted: boolean }`.

### AC-6 — Ownership isolation

> Given two distinct authenticated users (User A, User B),  
> When User B's Worker session queries the `transactions` table,  
> Then the SQL `WHERE owner_id = auth.userId` predicate ensures User B cannot read or modify User A's rows.

### AC-7 — Sign-out clears session

> Given the user is signed in,  
> When they invoke Clerk's `signOut()`,  
> Then the `__session` cookie is cleared,  
> And a subsequent `GET /api/me` returns HTTP 401.

### AC-8 — Consent sync

> Given the user accepted consent in BIL-1 (stored in `localStorage` under key `billi_consent`),  
> When `GET /api/me` is called for the first time after sign-in,  
> Then the Worker reads the `consent_v` / `consent_at` fields from the JWT-identified user's localStorage payload (sent as a header or body by the frontend),  
> And writes them to `users.consent_v` / `users.consent_at` in Turso.

---

## 4. Architecture Diagram

The following sequence describes the happy path for a returning authenticated user:

```
Browser                Clerk (hosted)          Worker (CF)            Turso
  |                        |                       |                     |
  |-- GET / (no cookie)--> |                       |                     |
  |<- redirect /sign-in -- |                       |                     |
  |                        |                       |                     |
  |-- sign-in form ------> |                       |                     |
  |<- JWT (__session) ----- |                       |                     |
  |                        |                       |                     |
  |-- GET /api/me -------->|                       |                     |
  |   (cookie attached)    |-- clerkMiddleware ---> |                     |
  |                        |   verifyToken (JWKS)  |                     |
  |                        |<-- auth.userId --------|                     |
  |                        |                       |-- UPSERT users ---> |
  |                        |                       |<-- row ------------ |
  |<-- { userId, email,    |                       |                     |
  |      consentAccepted } |                       |                     |
```

Notes:
- JWKS keys are fetched from `https://clerk.your-domain.com/.well-known/jwks.json` and cached by `@hono/clerk-auth` with a sane TTL (default 5 minutes).
- In dev, Vite proxies `/api/*` to `localhost:8787` (Wrangler dev server). In prod, Cloudflare Pages Functions route `/api/*` to the Worker on the same origin — no CORS issues.
- The `__session` cookie is first-party, `SameSite=Strict` (set by Clerk SDK). The Worker reads it via the `Authorization: Bearer` header injected by `@clerk/clerk-react`'s fetch wrapper, or directly from the cookie depending on the Clerk SDK version.

---

## 5. Data Contracts

### 5.1 `users` table (Drizzle pseudocode)

```ts
// packages/db/src/schema/users.ts
export const users = sqliteTable('users', {
  id:         text('id').primaryKey(),           // Clerk sub (e.g. "user_2abc…")
  email:      text('email').notNull().unique(),
  createdAt:  integer('created_at', { mode: 'timestamp' }).notNull()
              .default(sql`(unixepoch())`),
  consentV:   integer('consent_v'),              // semver int, null until consent synced
  consentAt:  integer('consent_at'),             // unix timestamp, null until synced
});
```

Migration file: `packages/db/migrations/0001_users.sql`

### 5.2 `GET /api/me` — response body

```jsonc
// HTTP 200
{
  "userId": "user_2abc…",          // Clerk sub
  "email": "user@example.com",
  "consentAccepted": true,         // true if users.consent_v IS NOT NULL
  "consentVersion": 1              // null if consent not yet synced
}
```

### 5.3 `POST /api/me/consent` — request + response

```jsonc
// Request body
{
  "version": 1,           // consent document version integer
  "acceptedAt": 1713912345 // unix timestamp (seconds)
}

// Response: HTTP 204 No Content
```

---

## 6. UI Surface

The following files are created or modified as part of this spec slice. No implementation code is written in the Spec step — this list is the implementation contract for the Tests and Implement steps.

| File | Action | Purpose |
|---|---|---|
| `apps/web/src/main.tsx` | Modify | Wrap `<App />` in `<ClerkProvider publishableKey={…}>` |
| `apps/web/src/routes/sign-in.tsx` | Create | Render Clerk `<SignIn />` at `/sign-in/*` |
| `apps/web/src/routes/sign-up.tsx` | Create | Render Clerk `<SignUp />` at `/sign-up/*` |
| `apps/web/src/App.tsx` | Modify | Add `/sign-in/*`, `/sign-up/*` routes; wrap root layout with `<SignedIn>` / `<SignedOut redirectUrl="/sign-in">` |
| `apps/web/src/lib/api-client.ts` | Create | Thin `fetch` wrapper that sets `credentials: 'include'` on all `/api/*` calls |
| `apps/web/src/hooks/use-me.ts` | Create | React hook that calls `GET /api/me` and returns user identity + consent state |
| `worker/src/index.ts` | Create | Hono app entry; mounts `clerkMiddleware`, routes `/api/me` |
| `worker/src/routes/me.ts` | Create | `GET /api/me` (upsert + return) and `POST /api/me/consent` handlers |
| `packages/db/src/schema/users.ts` | Create | Drizzle table definition |
| `packages/db/migrations/0001_users.sql` | Create | SQL migration generated by `drizzle-kit generate` |

---

## 7. Secrets and Environment Matrix

| Variable | Where | How |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | SPA build (`.env.local` in dev, CF Pages env var in prod) | Injected at build time by Vite |
| `CLERK_SECRET_KEY` | Worker (`wrangler secret put CLERK_SECRET_KEY`) | Never committed; set per environment in CF dashboard |
| `CLERK_JWT_KEY` | Worker — optional | Only needed if overriding JWKS auto-discovery; leave unset unless debugging |
| `TURSO_DATABASE_URL` | Worker (`wrangler.toml` non-secret or `.dev.vars`) | `libsql://…turso.io` |
| `TURSO_AUTH_TOKEN` | Worker (`wrangler secret put TURSO_AUTH_TOKEN`) | Never committed |

`.dev.vars` (gitignored) holds dev values for `CLERK_SECRET_KEY` and `TURSO_AUTH_TOKEN`. The `.gitignore` entry for `*.dev.vars` must be verified before this branch is opened as a PR.

---

## 8. Test Plan

Tests are written in the **Tests** step (step 2 of the SpecSafe loop) before any implementation. This section defines the exact test cases and file paths that must exist and pass before the slice is marked complete.

### 8.1 Frontend — Vitest + @testing-library/react

File: `apps/web/src/tests/auth.test.tsx`

| # | Test case | Assertion |
|---|---|---|
| F-01 | Unauthenticated root navigates to `/sign-in` | Render `<App />` with mock Clerk returning `userId: null`; assert `window.location.pathname === '/sign-in'` or `<RedirectToSignIn>` is rendered |
| F-02 | Authenticated user sees protected route children | Render `<App />` with mock Clerk returning a valid `userId`; assert root layout renders without redirect |
| F-03 | `useMe` returns identity data after sign-in | Render hook with MSW intercepting `GET /api/me` returning `{ userId, email, consentAccepted: true, consentVersion: 1 }`; assert hook returns matching data |
| F-04 | `useMe` returns `null` / loading before response | Assert hook is in loading state before MSW responds |
| F-05 | Sign-out clears `useMe` state | After sign-in resolves, invoke Clerk `signOut()` mock; assert `useMe` returns `null` |

### 8.2 Worker — Vitest + @cloudflare/vitest-pool-workers

File: `worker/src/tests/me.test.ts`

| # | Test case | Assertion |
|---|---|---|
| W-01 | `GET /api/me` without auth cookie returns 401 | Request with no `Authorization` header; assert response status `401` |
| W-02 | `GET /api/me` with valid JWT upserts `users` row | Inject a signed test JWT; assert Turso (miniflare in-memory) contains the expected row and response body matches the contract |
| W-03 | Second `GET /api/me` is a no-op upsert | Call twice with same JWT; assert `users` table still has exactly one row for that `userId` |
| W-04 | `POST /api/me/consent` updates `users.consent_v` | POST `{ version: 1, acceptedAt: 1713912345 }`; assert row has `consent_v = 1` and `consent_at = 1713912345`; response is 204 |
| W-05 | User B cannot query User A's `transactions` | Cross-user ownership test — noted here for cross-reference; the full exercise lives in BIL-4's test suite, but the ownership predicate (`WHERE owner_id = auth.userId`) must be validated there |

Total: 9 test cases across both suites (F-01 through F-05, W-01 through W-04, plus W-05 cross-reference note).

---

## 9. Verify — PASS/FAIL Checklist

The following items must all be checked before the slice is marked **PASS** and advanced to Complete. Any unchecked item is a **FAIL** — loop back to Implement.

- [ ] All 9 test cases pass with `vitest run` (0 failures, 0 skipped).
- [ ] TypeScript compilation is clean: `tsc --noEmit` exits 0 in both `apps/web/` and `worker/`.
- [ ] ESLint exits 0 with no warnings suppressed.
- [ ] Manual smoke test: sign up with a real email address, receive verification email, verify, land on `/`.
- [ ] Manual smoke test: Google OAuth sign-in completes end-to-end in the local dev environment.
- [ ] After first sign-in, a `users` row exists in Turso dev DB with correct `id`, `email`, and `created_at`.
- [ ] A second sign-in with the same account does not create a duplicate row (upsert is idempotent).
- [ ] JWT expiry (simulate by advancing clock or using a short-lived test token): `/api/me` returns 401.
- [ ] Wrangler secrets `CLERK_SECRET_KEY` and `TURSO_AUTH_TOKEN` are configured in the CF dashboard for both preview and production environments.
- [ ] No JWT value, session token, or other secret appears in Worker `console.log` output.
- [ ] `wrangler.toml` and `.dev.vars` are NOT committed (verified via `git diff --cached`).
- [ ] `__session` cookie is visible in browser DevTools as first-party, `SameSite=Strict`, `HttpOnly`.

---

## 10. Security Checklist

- **Secrets only in Wrangler / CF dashboard.** `CLERK_SECRET_KEY` and `TURSO_AUTH_TOKEN` are never hardcoded, never committed, never logged.
- **JWKS cache TTL.** The `@hono/clerk-auth` middleware fetches JWKS on cold start and caches per its default TTL (~5 min). If Clerk rotates keys, the Worker will pick up new keys within one TTL window. Verify the TTL is acceptable; add a manual override if it is not.
- **CORS policy.** In production the Worker and SPA share the same Cloudflare Pages origin — no CORS needed. In dev, Vite proxy handles the origin boundary. The Worker must NOT set permissive `Access-Control-Allow-Origin: *` headers — if any CORS config is added, it must be allowlist-based.
- **Cookie scope.** `__session` is set by the Clerk SDK. Verify it is `HttpOnly`, `Secure` (in prod), and scoped to the correct domain. No custom cookie logic should loosen these properties.
- **No PII in Worker logs.** Worker logs (accessible in CF dashboard) must not contain email addresses, Clerk user IDs, or any financial data. Use structured logging that omits or hashes PII before any log call.
- **`users.email` exposure.** The Worker returns `email` only on `GET /api/me`, which is authenticated and scoped to the requesting user. No endpoint returns another user's email. Any future endpoint touching user data must verify `auth.userId === requested_user_id`.
- **Frontend ownership enforcement is UX only.** `<SignedIn>` / `<SignedOut>` guards in React prevent accidental navigation but are not a security control. The authoritative ownership check is the `WHERE owner_id = auth.userId` predicate at the SQL layer in the Worker on every query.

---

## 11. LFPDPPP Note (Ley Federal de Protección de Datos Personales en Posesión de Particulares)

This spec slice directly satisfies obligations under two LFPDPPP articles:

- **Art. 15 — Consent (Consentimiento).** The BIL-1 consent flow (onboarding) captures and displays the privacy notice. This slice persists the user's acceptance (`consent_v`, `consent_at`) to the `users` table via `POST /api/me/consent`, creating the auditable consent record required by Art. 15. The version integer allows future re-consent if the privacy notice changes materially.
- **Art. 36 — Cross-border data transfers.** Clerk processes identity data (email, credential hash) on US-based infrastructure. The privacy notice (BIL-1) must disclose this transfer. The `consent_at` timestamp in `users` documents that the data subject was informed and accepted before their data was processed by Clerk. No additional Art. 36 safeguard mechanism is required for the MVP given Clerk's SOC 2 Type II certification and standard contractual basis, but legal review of the final privacy notice is recommended before public beta.

---

## 12. Open Questions

1. **Email verification gate.** Do we block access to the app until Clerk verifies the email, or allow unverified users to enter with a persistent banner prompting verification? Clerk defaults to blocking — confirm this matches the product intent before implementing. If a banner is preferred, a separate story should be created.

2. **ADR-003 document state.** `docs/planning/architecture/` currently documents Better Auth (AD-03) as the identity provider. This spec assumes ADR-003 will be updated to record the Clerk pivot. Confirm that the ADR update is either a prerequisite or a parallel task to this slice. The CLAUDE.md stack table also needs updating (`Better Auth with Drizzle adapter` → `Clerk`).

3. **Consent sync direction.** AC-8 assumes the frontend passes the localStorage consent payload (version + timestamp) to the Worker as part of the first `GET /api/me` or `POST /api/me/consent` call. The exact mechanism — request header, query param, or explicit POST body — must be decided before the Tests step.

4. **`@hono/clerk-auth` package status.** Verify the package is available on npm and compatible with the Hono version in use before the Implement step. As of April 2026, the canonical approach may be `hono/clerk` or a community adapter — check official Clerk + Hono integration docs.

5. **Clerk Publishable Key domain binding.** The Clerk publishable key must be configured in the Clerk dashboard to allow requests from the CF Pages preview URL (`*.pages.dev`) in addition to the production domain. Confirm this is set up before running integration tests against the preview environment.
