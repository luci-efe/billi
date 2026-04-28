---
id: CI-02
title: "CI-02: Cloudflare staging deploy on push to dev"
cycle: 1
epic: OPS
milestone: MS-01
estimate: M (3 points)
priority: High
status: Todo
owner: Fernando
linear_url: (not yet filed)
git_branch: ci-02-cloudflare-staging-deploy
blocked_by:
  - CI-01
blocks: []
depends_on_adr:
  - ADR-003
---

# CI-02 — Cloudflare staging deploy

## 1. Purpose

Every merge to `dev` must land on a reachable staging URL within minutes so that acceptance testers, designers, and the PM can verify behavior against real Cloudflare infrastructure, not a localhost bubble. This slice:

1. Adds a `[env.staging]` (and a prepared-but-guarded `[env.production]`) block to `apps/api/wrangler.toml` so the Worker can be deployed under distinct names per environment.
2. Authors `.github/workflows/deploy-staging.yml` that runs on push to `dev` and deploys both surfaces — the Hono Worker and the Vite SPA — to staging. The Worker is deployed with `wrangler deploy --env staging`; the SPA is deployed as a Cloudflare Pages project (`billi-web-staging`) via `wrangler pages deploy apps/web/dist`.
3. Surfaces the running URLs in the GitHub Actions job summary so clicking a green deploy jumps straight to the staging site.
4. Authors a parallel `.github/workflows/deploy-production.yml` guarded by `if: github.ref == 'refs/heads/main'` so the pattern is symmetric but inert until a production domain exists.
5. Writes `docs/ops/cloudflare-setup.md` with the exact operator runbook: API token scopes, dashboard URLs, `wrangler secret put --env staging` commands, and staging-URL discovery.

Rationale for **Pages for SPA over Workers Static Assets**: Pages is the shortest path — built-in preview URLs, zero-config, and `wrangler pages deploy` is a one-liner that predates and outlives the Workers Assets migration. If the SPA ever needs to share origin with the API for cookie reasons beyond what same-site-on-workers.dev gives us, we re-evaluate in a later slice; for Cycle 1 staging, same-origin is not required — the SPA calls the Worker cross-origin with `credentials: 'include'` against the `*.workers.dev` URL configured via a `VITE_API_BASE_URL` build-time env var.

---

## 2. Scope Boundaries

### In scope

- `apps/api/wrangler.toml` — add `[env.staging]` with `name = "billi-api-staging"` and `workers_dev = true` (default subdomain activated so we have an immediate URL). Add `[env.production]` block with `name = "billi-api-production"`, route stanza commented out until real domain exists.
- `.github/workflows/deploy-staging.yml`:
  - Trigger: `push: { branches: [dev] }`, plus `workflow_dispatch:`.
  - Jobs:
    - `deploy-api`: checkout → setup Bun (cached) → `bun install --frozen-lockfile` → `bun run --filter @billi/api build` → `wrangler deploy --env staging` via `cloudflare/wrangler-action@<sha>`.
    - `deploy-web`: checkout → setup Bun → install → `VITE_API_BASE_URL=<staging-worker-url> bun run --filter @billi/web build` → `wrangler pages deploy apps/web/dist --project-name=billi-web-staging --branch=dev` via the same action.
  - Both jobs post their deployed URL to `$GITHUB_STEP_SUMMARY`.
- `.github/workflows/deploy-production.yml` — mirror of staging, triggered on push to `main`, guarded by `if: github.ref == 'refs/heads/main'`, with a leading `notice:` step that logs "production not yet wired — add domain binding and flip this guard when ready".
- `docs/ops/cloudflare-setup.md` — operator runbook covering:
  - Account linking (`wrangler whoami` → confirm Account ID `48f381bf59212dbd98d2b424ba4b9a04`, account name `Agentic Engineering`).
  - CF API token creation (exact scopes + dashboard URL).
  - GitHub secret names and where to paste each value.
  - One-time creation of the Pages project (`wrangler pages project create billi-web-staging --production-branch=main`).
  - `wrangler secret put --env staging <NAME>` runbook, one line per secret.
- `VITE_API_BASE_URL` added to `apps/web/.env.local.example` (optional in dev; dev proxy already handles it) and to the `env-shape` canonical list maintained by CI-01.

### Out of scope

- Production domain binding, `[[routes]]` activation, DNS record creation.
- Custom staging subdomain (`billi-staging.agenticengineering.agency`) — brief allows falling back to `*.workers.dev` / `*.pages.dev`, which this slice uses.
- Post-deploy smoke tests / synthetic monitoring.
- Rollback automation. Cloudflare keeps the previous version reachable via the dashboard; rollback is an operator action.
- Secret management inside the workflow. Secrets are created once per environment by the operator via `wrangler secret put --env staging <NAME>`; the workflow never touches them.

---

## 3. Acceptance Criteria

### AC-1 — Push to `dev` triggers staging deploy
> Given a push lands on the `dev` branch,
> When `deploy-staging.yml` receives the event,
> Then both `deploy-api` and `deploy-web` jobs run in parallel (or sequentially if a dependency is declared) and both succeed against Cloudflare Account `48f381bf59212dbd98d2b424ba4b9a04` (Agentic Engineering org).

### AC-2 — Worker reachable after deploy
> Given `deploy-api` completes,
> Then `curl https://billi-api-staging.<workers-subdomain>.workers.dev/health` returns HTTP 200 with body `{ ok: true }`.

### AC-3 — SPA reachable after deploy
> Given `deploy-web` completes,
> Then `https://billi-web-staging-6pj.pages.dev/` (or `https://<commit-sha>.billi-web-staging-6pj.pages.dev/` for the per-commit preview) returns HTTP 200 and serves the Vite-bundled SPA.

### AC-4 — Staging URLs visible in job summary
> Given a deploy run completes (green or red),
> Then the GitHub Actions run summary page prints the deployed URL(s) under a **Deployed to** heading.

### AC-5 — Secrets flow, not in CI
> Given the workflow file is searched for any literal secret value,
> Then zero matches are found;
> And the only CF-related inputs come from `${{ secrets.CF_API_TOKEN }}` and `${{ secrets.CF_ACCOUNT_ID }}`.

### AC-6 — Production workflow inert today
> Given the current branch head is `dev`,
> Then `deploy-production.yml` does not run;
> And if it is manually dispatched against `dev`, its guard prevents any `wrangler deploy` invocation and logs "production not yet wired".

### AC-7 — Action pinning
> Given any `uses:` line in `deploy-staging.yml` or `deploy-production.yml`,
> Then it references a 40-char SHA with `# vX.Y.Z` trailing comment.

### AC-8 — `wrangler.toml` is well-formed
> Given `bun run --filter @billi/api build` (which runs `wrangler deploy --dry-run`) is invoked locally with the `--env staging` flag,
> Then it exits 0 and reports `name = billi-api-staging`.

---

## 4. Data Contracts

### 4.1 `apps/api/wrangler.toml` additions (illustrative)

```toml
# existing top-level config stays as-is (name, main, compatibility_date, nodejs_compat, [observability])

[env.staging]
name = "billi-api-staging"
workers_dev = true            # reach via https://billi-api-staging.<subdomain>.workers.dev
# Route stanza intentionally omitted; *.workers.dev URL is enough for staging.
# Secrets are set once per env:
#   wrangler secret put CLERK_SECRET_KEY     --env staging
#   wrangler secret put TURSO_DATABASE_URL   --env staging
#   wrangler secret put TURSO_AUTH_TOKEN     --env staging
#   wrangler secret put OPENROUTER_API_KEY   --env staging

[env.production]
name = "billi-api-production"
workers_dev = false
# [[env.production.routes]]
# pattern = "billi.example.com/api/*"
# zone_name = "billi.example.com"
# Uncomment once the production domain exists (tracked in ops/cloudflare-setup.md).
```

### 4.2 Required GitHub Actions secrets (repository scope)

| Secret | Value | Source |
|---|---|---|
| `CF_API_TOKEN` | Cloudflare API token scoped to staging deploys | Created by operator via CF dashboard (scopes in §5) |
| `CF_ACCOUNT_ID` | `48f381bf59212dbd98d2b424ba4b9a04` | Provided by user (Agentic Engineering org Cloudflare account; see `docs/ops/cloudflare-setup.md`) |

### 4.3 Canonical CF API token scopes

Minimum permissions to run `wrangler deploy --env staging` AND `wrangler pages deploy`:

- **Account** · Workers Scripts · **Edit**
- **Account** · Cloudflare Pages · **Edit**
- **Account** · Account Settings · **Read**
- Zone resources: none required for `*.workers.dev` / `*.pages.dev` staging.

TTL: rotate every 90 days. No other scopes. Reject any recipe that requests "Account — All" or "All zones, all accounts".

---

## 5. Files Created / Modified

| File | Action | Purpose |
|---|---|---|
| `apps/api/wrangler.toml` | Modify | Add `[env.staging]` and `[env.production]` blocks per §4.1 |
| `.github/workflows/deploy-staging.yml` | Create | Push-to-`dev` deploy; two jobs, one per surface |
| `.github/workflows/deploy-production.yml` | Create | Mirror for `main`, guarded/inert |
| `docs/ops/cloudflare-setup.md` | Create | Operator runbook per §2 |
| `apps/web/.env.local.example` | Modify | Add `VITE_API_BASE_URL` placeholder |
| CI-01's `env-shape` canonical list | Update | Include `VITE_API_BASE_URL` in `apps_web_env_local` |

---

## 6. Test Plan

| # | Test | Assertion |
|---|---|---|
| D-01 | Workflow YAML syntax | `actionlint` reports zero errors for both deploy workflows |
| D-02 | SHA pinning | `grep -E 'uses: .+@[0-9a-f]{40}' .github/workflows/deploy-*.yml` matches every `uses:` line |
| D-03 | `wrangler.toml` env parsing | `wrangler deploy --env staging --dry-run` exits 0 and prints `billi-api-staging` |
| D-04 | Happy path end-to-end | After the first operator push to `dev`, both surfaces return 200 and URLs appear in the run summary |
| D-05 | Secret absence | `grep -RE '(pk_live|sk_live|AKIA|ghp_)' .github/workflows/` finds zero matches |
| D-06 | Production guard | Manual `workflow_dispatch` of `deploy-production.yml` from a non-`main` ref emits the "production not yet wired" notice and exits without calling `wrangler deploy` |

---

## 7. Verify — PASS/FAIL Checklist

- [ ] `[env.staging]` present in `apps/api/wrangler.toml` with `name = "billi-api-staging"`, `workers_dev = true`.
- [ ] `[env.production]` present with route block commented and a leading comment explaining why.
- [ ] `deploy-staging.yml` triggers on push to `dev` and on `workflow_dispatch`.
- [ ] `deploy-staging.yml` passes `${{ secrets.CF_API_TOKEN }}` and `${{ secrets.CF_ACCOUNT_ID }}` to `cloudflare/wrangler-action` — and nothing else.
- [ ] `deploy-staging.yml` writes at least one "Deployed to: <url>" line to `$GITHUB_STEP_SUMMARY` per job.
- [ ] `deploy-production.yml` exists, is guarded, and is inert until domain binding is done.
- [ ] All actions pinned by 40-char SHA with `# vX.Y.Z` comment.
- [ ] `docs/ops/cloudflare-setup.md` exists and contains:
  - [ ] Exact API token scope list.
  - [ ] Dashboard URL for token creation (`https://dash.cloudflare.com/profile/api-tokens`).
  - [ ] Four `wrangler secret put --env staging <NAME>` commands (one per runtime secret).
  - [ ] `wrangler pages project create billi-web-staging --production-branch=main` one-time command.
  - [ ] Account ID `48f381bf59212dbd98d2b424ba4b9a04` (Agentic Engineering org) recorded with a note that it is NOT sensitive but goes into `CF_ACCOUNT_ID` secret for symmetry.
- [ ] `apps/web/.env.local.example` includes `VITE_API_BASE_URL=`.
- [ ] No `bun install` runs anywhere in a hand-edited commit (install happens only in CI and on developer machines).

---

## 8. Security Checklist

- [ ] `CF_API_TOKEN` is the minimum-scope token described in §4.3. Reject broader scopes.
- [ ] Token rotation reminder (90 days) added to `docs/ops/cloudflare-setup.md`.
- [ ] The workflow does not set or modify any Worker secret — secrets flow only via `wrangler secret put --env staging` executed locally by the operator.
- [ ] `permissions:` at the workflow top level is `contents: read` only (plus `id-token: write` if later switching to OIDC; not today).
- [ ] `pull_request_target` is NOT used.
- [ ] The Worker deploys WITHOUT mounting `.dev.vars` (that file is gitignored and not copied into CI). Staging uses the secrets that were set via `wrangler secret put --env staging`.
- [ ] The SPA build injects `VITE_API_BASE_URL` at build time; no runtime secret leaks into the bundle (only the publishable Clerk key, which is public by design).

---

## 9. LFPDPPP Note

Staging is a real Cloudflare deployment that may eventually receive real (test) user data. Before onboarding any real user to staging, the privacy notice must disclose that staging runs on US-hosted Cloudflare infra (same obligation as production — Art. 36). Until the first real-user test, staging is developer-only, so no immediate LFPDPPP action is required beyond the note.

---

## 10. Open Questions

1. **Custom staging subdomain.** User will likely want `billi-staging.agenticengineering.agency` eventually. That is a Zone route change + DNS, tracked as a follow-up, not in this slice.
2. **Preview-per-PR deploys.** Cloudflare Pages gives us PR preview URLs for free; for the Worker, preview deploys would require `--env preview` and a third config block. Deferred to a later slice.
3. **Turso dev vs staging DB separation.** Confirm with the owner whether staging hits a separate Turso database (`billi-staging`) or shares the dev DB. Default assumption in the ops doc: **separate database**, one-time `turso db create billi-staging` during operator setup.
