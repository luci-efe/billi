---
id: ADR-003
title: Clerk as authentication provider (supersedes AD-03 Better Auth)
status: Accepted
date: 2026-04-24
supersedes: AD-03 (in `docs/planning/architecture/7-decisiones-clave-y-tradeoffs.md`)
stack_scope: auth only — Turso/Drizzle (AD-01), Cloudflare Pages+Workers, Vite+React (rest of stack) unchanged
---

# ADR-003 — Adopt Clerk for authentication

## Context

The original architecture (AD-03) selected Better Auth with a Drizzle adapter so that session and user records live in the same Turso database as domain data (transactions, consents, etc.), making ownership joins trivial and keeping all PII inside our own infrastructure.

At the start of Cycle 1 implementation we reassessed. The project is a one-semester academic MVP. The auth surface we actually need for the MVP is: email+password, at least one OAuth provider, session verification in a Hono Worker, and a stable `user_id` to foreign-key domain rows against. Owning the Better Auth schema, the password hashing, email verification flow, password-reset tokens, rate limiting, OAuth callbacks, and session rotation — on top of Cloudflare Workers — is real work and an ongoing liability we do not want to carry while also building the RAG corpus and the transactions ledger inside a 5-cycle budget.

## Decision

Adopt **Clerk** as the authentication provider for Billi. Clerk hosts the user identity database, the password hashing, the OAuth callback flow, email verification, password reset, MFA (if later needed), and the hosted UI components. Our application code receives a short-lived JWT that we verify inside the Hono Worker on every request using Clerk's JWKS.

No other architectural decision changes. Turso+Drizzle (AD-01) remains the domain database, Cloudflare Pages+Workers remains the runtime, Vite+React+shadcn remains the frontend, R2 remains binary storage, Dodo Payments remains billing.

## Integration shape

Conceptually the auth layer becomes an *external* identity provider rather than an in-database table set. The data flow for a protected request is:

1. Browser (Vite SPA) loads the Clerk React SDK and renders the `<SignIn />` / `<SignUp />` components.
2. On successful sign-in Clerk places a short-lived session JWT in a first-party cookie (`__session`) scoped to our domain.
3. The SPA includes this cookie (or an explicit `Authorization: Bearer` header from `getToken()`) on every `fetch` to the Hono Worker at `/api/*`.
4. The Hono Worker runs a `clerkMiddleware()` that fetches Clerk's JWKS (cached), verifies the JWT signature, and attaches `auth.userId` to the request context.
5. Our application code uses that `auth.userId` as the canonical `owner_id` for every Turso query. There is no session table in Turso; Clerk is the session authority.

To keep domain-level joins clean we still maintain a **`users` mirror table** in Turso:

| column        | type      | notes                                           |
|---------------|-----------|-------------------------------------------------|
| `id`          | text PK   | equals Clerk `user_id` (e.g. `user_2abc…`)      |
| `email`       | text      | mirrored from Clerk, eventually consistent      |
| `created_at`  | integer   | unix seconds                                    |
| `consent_v`   | integer   | which consent revision the user accepted        |
| `consent_at`  | integer   | unix seconds of last consent acceptance         |

The mirror is populated on first authenticated request (upsert by `id`) and optionally kept in sync via a Clerk webhook (`user.created`, `user.updated`, `user.deleted`). The MVP ships with upsert-on-first-request only; the webhook is a post-MVP hardening task.

This mirror is what domain tables foreign-key against — `transactions.owner_id → users.id` — so the SQL ledger can enforce ownership at the database layer exactly as AD-03 required, with Clerk as the authority for identity rather than Better Auth.

## Consequences

**Positive.**

- Removes ~400 LOC of auth plumbing (schema, hashing, flows, rate limits) from our codebase and from the Cycle 1 budget.
- Ships OAuth (Google at minimum) at zero incremental cost — Clerk handles the callback dance.
- Hosted UI components (`<SignIn />`, `<UserButton />`, `<SignedIn>`) match shadcn aesthetic reasonably well and can be themed.
- JWT verification in the Worker is stateless — no DB round-trip on every request for session lookup.
- Clear separation of concerns: Clerk owns *who you are*, Turso owns *what you did*.

**Negative / tradeoffs.**

- **Vendor lock-in on identity.** Migrating off Clerk later means rebuilding sign-up/sign-in UI and importing users. Mitigation: the `users` mirror in Turso means domain data is not coupled to Clerk IDs semantically — only the PK string is. A future migration swaps the authority and keeps FKs intact.
- **Cross-border PII transfer.** Clerk stores email + password hash + OAuth tokens + session metadata on US infrastructure. Under LFPDPPP Art. 36, transfer of personal data outside Mexico requires the data subject's **informed consent**. This must be surfaced explicitly in the consent copy of BIL-1 ("los datos de acceso se almacenan con nuestro proveedor de identidad Clerk Inc. en Estados Unidos"). The privacy notice (`docs/planning/architecture/11-seguridad-privacidad-y-cumplimiento.md`) must be amended to list Clerk as a sub-processor.
- **Pricing cliff.** Clerk free tier is 10k MAUs. Not a problem for MVP; is a problem if the app takes off. Accepted — we will not optimise for hypothetical scale.
- **Less DB-level coupling than AD-03 envisioned.** We lose the elegant "one JOIN across sessions and transactions" that Better Auth enabled. In practice the MVP does not need this — ownership checks are by `userId` string, not by session.

**Neutral but worth noting.**

- Clerk's backend SDK (`@clerk/backend`) is Workers-compatible as of v1.x. The Hono integration uses `@hono/clerk-auth` which wraps `clerkMiddleware()`.
- JWKS is cached by Clerk's SDK with sane TTLs; no DIY cache required.
- For React Router v7 SPA we use `@clerk/clerk-react` with `<ClerkProvider>` at the root and `<SignedIn>` / `<SignedOut>` guards per route.

## Alternatives considered (and rejected)

- **Keep Better Auth (AD-03 as-is).** Rejected because the Cycle 1 budget cannot absorb owning the full auth stack on top of the transactions model and the RAG ingest. This is a budget decision, not a technical one — Better Auth is an excellent library.
- **Supabase Auth.** Rejected because adopting it implies either bringing in the whole Supabase stack (contradicts AD-01 Turso) or running Supabase Auth standalone (not its happy path).
- **Lucia / Auth.js on Workers.** Rejected for the same budget reason as Better Auth, plus Auth.js's Workers story is weaker than Clerk's.
- **Clerk + Neon (user's initial suggestion).** Auth half accepted, DB half rejected — Neon is Postgres, Turso is libSQL; swapping would also invalidate AD-04 (vector search native to Turso), which is the critical path for BIL-13 RAG ingest.

## Impact on Sprint 1

- **BIL-1 (onboarding/consent):** consent copy must explicitly name Clerk as sub-processor and US as storage jurisdiction. Affects UI text only.
- **BIL-2 (registro/login):** implementation becomes "drop `<SignIn />` and `<SignUp />` into `/sign-in` and `/sign-up` routes, add `<ClerkProvider>`, wire Hono `clerkMiddleware()`, create `users` mirror table + upsert function" instead of "build auth from scratch." Estimate unchanged (M=3) — saved implementation time is absorbed by the mirror+webhook design.
- **BIL-4 (transactions model):** `transactions.owner_id text not null references users(id)`. Schema unaffected by the auth change.
- **BIL-13 (RAG):** unaffected.
- **BIL-18 (CSV export):** unaffected; ownership check uses `auth.userId` from Hono context.

## Follow-up documentation tasks

- Append supersede note to AD-03 in `docs/planning/architecture/7-decisiones-clave-y-tradeoffs.md` pointing to this ADR.
- Amend `docs/planning/architecture/11-seguridad-privacidad-y-cumplimiento.md` with Clerk as a named sub-processor and the LFPDPPP Art. 36 consent requirement.
- Update `CLAUDE.md` stack line: replace "Better Auth" with "Clerk".
- Update `docs/planning/prd/12-guardrails-del-asistente.md` if it references in-house session management (likely no change needed).
