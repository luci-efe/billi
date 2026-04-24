# Cycle 1 — Scaffolding Plan (executed)

**Status:** Executed — directory structure and skeleton files are in place. Remaining work is `bun install`, filling in real secrets, and wiring Clerk into the existing routes (feature work owned by BIL-1 / BIL-2).
**Author:** Engineering
**Date:** 2026-04-24
**Scope:** Repository layout, Bun workspace, Worker skeleton, DB package, Clerk wiring, env matrix, test stack, CORS strategy, and migration ordering. No feature logic.

---

## 0. Purpose and framing

The repository now follows the standard Bun-workspace monorepo shape:

```
billi/
├── apps/
│   ├── web/        # Vite + React SPA (promoted from former prototype/)
│   └── api/        # Hono on Cloudflare Workers — /api/* endpoints
├── packages/
│   └── db/         # Drizzle schema, migrations, libSQL client factory
├── docs/           # BMad planning + SpecSafe specs
├── package.json    # Bun workspace root
├── tsconfig.json   # TS solution file referencing each package
└── tsconfig.base.json
```

Three workspaces solve three distinct problems. `apps/web/` bundles through Vite and ships to the browser; only `VITE_*` vars reach its bundle. `apps/api/` runs in a V8 isolate on Cloudflare Workers and holds every runtime secret (`CLERK_SECRET_KEY`, `TURSO_AUTH_TOKEN`). `packages/db/` is the shared source of schema truth — its Drizzle table definitions are imported as runtime values by the Worker and as types by any future shared-model code. A column change is a single edit and both consumers are updated.

The rest of this document annotates every file that was created or modified and explains why it looks the way it does. Reading it top-to-bottom is enough to understand the skeleton; no pre-existing knowledge of Bun workspaces, Clerk, or Turso is assumed.

---

## 1. Repo layout

- **`apps/web/`** — former `prototype/`, moved with `git mv` so history is preserved. Package renamed from `prototype` to `@billi/web`. Keeps its own `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, and shadcn configuration (`components.json`). All existing routes (`landing`, `dashboard`, `transactions`, `chat`, `invoices`, `settings`) and components work unchanged.
- **`apps/api/`** — new. Hosts the Hono app that serves `/api/*`. Deployed as a standalone Worker; in production it is bound to `<domain>/api/*` via a Cloudflare zone route so the browser always sees the API as same-origin. Contains `src/index.ts`, `src/env.ts`, `src/db.ts`, `wrangler.toml`, and `.dev.vars.example`.
- **`packages/db/`** — new. Owns `src/schema/*.ts`, `src/client.ts`, `drizzle.config.ts`, and the `migrations/` folder. Exports three entry points: `@billi/db` (barrel), `@billi/db/schema` (table objects), and `@billi/db/client` (client factory).

The top-level `package.json` declares `"workspaces": ["apps/*", "packages/*"]`. Bun resolves cross-workspace deps via `workspace:*` — e.g. `@billi/web` depends on `@billi/db` via `"@billi/db": "workspace:*"`, which makes Bun symlink the local package instead of pulling from a registry.

---

## 2. Bun workspace bootstrap

Root `package.json` adds these scripts:

| Script | Purpose |
|---|---|
| `bun dev` | Run every workspace's `dev` script in parallel (SPA + Worker) |
| `bun dev:web` | Vite dev server only |
| `bun dev:api` | Wrangler dev only |
| `bun build` | Build every workspace |
| `bun typecheck` | `tsc -b --noEmit` across every workspace |
| `bun test` | Vitest across every workspace |
| `bun db:generate` | `drizzle-kit generate` (SQL from schema) |
| `bun db:migrate` | `drizzle-kit migrate` (apply SQL to target Turso DB) |
| `bun db:studio` | Open Drizzle Studio for the configured DB |

Bun 1.1+ supports `bun run --filter '*' <script>` so each workspace exposes its own `dev`, `build`, `test`, `typecheck`, and `lint` scripts and the root script orchestrates them.

---

## 3. Worker (`apps/api/`)

**Files committed.**
- `apps/api/package.json` — deps: `hono`, `@hono/clerk-auth`, `@clerk/backend`, `@libsql/client`, `drizzle-orm`, `zod`, `@hono/zod-validator`, and workspace dep `@billi/db`.
- `apps/api/tsconfig.json` — extends `../../tsconfig.base.json`, `composite: true`, `types: ["@cloudflare/workers-types"]`.
- `apps/api/wrangler.toml` — `name = "billi-api"`, `main = "src/index.ts"`, `compatibility_date` set, `nodejs_compat` flag enabled (libSQL client uses a small Node surface). Production route commented out until a real domain exists.
- `apps/api/src/env.ts` — TypeScript `Env` interface typing every binding.
- `apps/api/src/db.ts` — `createDb(env)` factory returning a Drizzle client bound to the workspace schema.
- `apps/api/src/index.ts` — the Hono app. Mounts `clerkMiddleware()` on `/api/*`, adds a session gate that rejects unauthenticated requests with `401`, implements `GET /api/me` (upserts the `users` mirror row from the Clerk JWT claims) and `POST /api/me/consent`, and leaves comment placeholders for BIL-4 / BIL-18 route groups. A public `GET /health` lives outside the auth gate.
- `apps/api/.dev.vars.example` — committed template; real `.dev.vars` is git-ignored.

**Why standalone Worker + zone route (not Pages Functions).** Pages Functions require the function code to live inside the Pages project root, which muddles the monorepo boundary. A standalone Worker with a zone route (`billi.com/api/*` → `billi-api`) achieves the same same-origin property at the browser without compromising the workspace shape. In dev, the Vite proxy (`/api` → `127.0.0.1:8787`) preserves the same-origin contract locally.

---

## 4. DB package (`packages/db/`)

**Files committed.**
- `packages/db/package.json` — subpath exports: `.`, `./schema`, `./client`. Deps: `drizzle-orm`, `@libsql/client`; dev: `drizzle-kit`.
- `packages/db/tsconfig.json` — `composite: true`, `declaration: true` so the Worker's tsc build can consume emitted types.
- `packages/db/drizzle.config.ts` — `dialect: 'turso'`, schema path, output migrations dir, reads `TURSO_DATABASE_URL` from env.
- `packages/db/src/client.ts` — `createDbClient({ url, authToken })` factory shared between Worker and any standalone script (ingest, migration runner).
- `packages/db/src/schema/users.ts` — the one schema shipped with Cycle 1 scaffolding. PK `id` (text, = Clerk `user_id`), `email`, `created_at`, `consent_v`, `consent_at`. Matches ADR-003.
- `packages/db/src/schema/index.ts` — barrel; future slices re-export `transactions.ts` (BIL-4) and `rag.ts` (BIL-13).
- `packages/db/migrations/0001_users.sql` — literal CREATE TABLE for the users mirror. Committed so reviewers can audit schema changes in PRs.
- `packages/db/migrations/meta/_journal.json` — drizzle-kit's migration ledger.

---

## 5. Clerk integration surface (`apps/web/`)

**Already scaffolded (Cycle 1, pre-feature code).**
- `@clerk/clerk-react` added to `apps/web/package.json`.
- `apps/web/.env.local.example` committed with `VITE_CLERK_PUBLISHABLE_KEY` placeholder.
- `apps/web/vite.config.ts` updated with `/api` → `127.0.0.1:8787` dev proxy and Vitest config.

**Left for BIL-1 / BIL-2 feature work (spec-driven, do not pre-implement).**
- Wrap `<App />` in `<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>` inside `apps/web/src/main.tsx`.
- Add routes `/sign-in/*` and `/sign-up/*` rendering Clerk's `<SignIn />` / `<SignUp />`.
- Wrap the protected root layout in `<SignedIn>` with a `<SignedOut><RedirectToSignIn /></SignedOut>` sibling.
- Add `apps/web/src/lib/api-client.ts` with a `fetch` wrapper that sets `credentials: 'include'`.
- Add `apps/web/src/hooks/use-me.ts` calling `GET /api/me`.

These belong in BIL-2's Implement step per SpecSafe.

---

## 6. Secrets & env matrix

| Variable | Owner | Dev location | Prod location | Missing → |
|---|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | SPA build | `apps/web/.env.local` | Cloudflare Pages env var (plaintext) | `<ClerkProvider>` throws at startup |
| `CLERK_SECRET_KEY` | Worker runtime | `apps/api/.dev.vars` | `wrangler secret put CLERK_SECRET_KEY` | `clerkMiddleware()` fails JWT verify |
| `TURSO_DATABASE_URL` | Worker runtime | `apps/api/.dev.vars` | Wrangler secret | libSQL client cannot connect |
| `TURSO_AUTH_TOKEN` | Worker runtime | `apps/api/.dev.vars` | Wrangler secret | 401 from Turso on every query |
| `OPENROUTER_API_KEY` | Worker runtime (BIL-13) | `apps/api/.dev.vars` | Wrangler secret | Embedding ingest fails |

Rules:
- `.env.local` and `.dev.vars` are git-ignored via root `.gitignore`.
- `.env.local.example` and `.dev.vars.example` are committed templates.
- Prod secrets go through `wrangler secret put` — never committed.

---

## 7. Testing stack

- **Vitest** is the single test runner across the monorepo.
- `apps/web/` uses `jsdom` environment, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`. Setup file: `apps/web/src/test/setup.ts` imports `@testing-library/jest-dom/vitest`.
- `apps/api/` uses `@cloudflare/vitest-pool-workers` to run Worker tests inside Miniflare with real bindings. Each spec slice names its test files; the harness is wired but no feature tests exist yet.

---

## 8. CORS & dev proxy

- Dev: `apps/web/vite.config.ts` proxies `/api` → `http://127.0.0.1:8787`. Browser sees same-origin; no CORS handling needed in the Worker for dev.
- Prod: `billi.com/api/*` is routed to `billi-api` Worker via a Cloudflare zone route. Browser still sees same-origin. No CORS ever.
- A custom subdomain (`api.billi.com`) is explicitly rejected because it would re-introduce CORS and cookie-scoping concerns.

---

## 9. Migration ordering

- `0001_users.sql` — users mirror (this slice, shipped).
- `0002_transactions.sql` — BIL-4 transactions table.
- `0003_rag.sql` — BIL-13 RAG topics and chunks (with vector index).

Future slices append in order. Drizzle-kit is configured to write migrations as plain SQL files so they are PR-reviewable.

---

## 10. Out of scope for Cycle 1

Intentionally deferred, recorded here so no one tries to smuggle them in:

- Cloudflare Workers Trace / OpenTelemetry wiring (arch §12 baseline — needs its own slice later).
- Dodo Payments webhook handling.
- R2 bucket provisioning and signed-URL flow.
- Cloudflare Workflows for long-running RAG ingest.
- Clerk webhook for `user.deleted` / `user.updated` — MVP uses upsert-on-first-request only (ADR-003).
- Production custom domain binding — the zone route stays commented out in `wrangler.toml` until a real domain exists.

---

## 11. Remaining operator actions (post-scaffold, pre-development)

1. `bun install` at the repo root to populate `node_modules` across workspaces and generate `bun.lockb`.
2. Create a Clerk dev app → copy `pk_test_*` and `sk_test_*` into `apps/web/.env.local` and `apps/api/.dev.vars`.
3. Create a Turso dev DB (`turso db create billi-dev`) → copy URL + auth token into `apps/api/.dev.vars`.
4. `bun db:generate` to sanity-check that Drizzle can round-trip the schema (should produce no new migration since `0001_users.sql` already exists).
5. `bun db:migrate` against the dev DB.
6. `bun dev:api` (Worker on 8787) and `bun dev:web` (Vite on 5173) in separate terminals — confirm `/health` returns `{ ok: true }` through the Vite proxy.
7. Start SpecSafe step 2 (tests) for BIL-1 on a dedicated branch.

Do NOT run `bun install` as part of the scaffolding commit — keep the structural commit reviewable, let the first install happen on a developer machine or in CI.
