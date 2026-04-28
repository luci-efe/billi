# Cloudflare Setup — Operator Runbook

This document covers every one-time setup step an operator must complete before
the GitHub Actions staging deploy workflow can run successfully.

**Account:** personal Cloudflare account, email `lfernando.rramos@gmail.com`
**Account ID:** `4105f6b01897184bf93014d65f1a60f7`
(This value is not a secret, but it is stored as the `CF_ACCOUNT_ID` GitHub
Actions secret for workflow symmetry.)

---

## 1. Verify account linkage

```bash
wrangler whoami
```

Expected output includes `Account ID: 4105f6b01897184bf93014d65f1a60f7`.
If you see a different account, run `wrangler logout && wrangler login` to
re-authenticate against `lfernando.rramos@gmail.com`.

---

## 2. Create the Cloudflare API token

Open: <https://dash.cloudflare.com/profile/api-tokens>

Click **Create Token** → **Create Custom Token**.

### Required permissions

| Category        | Resource                  | Permission |
|-----------------|---------------------------|------------|
| Account         | Workers Scripts           | Edit       |
| Account         | Cloudflare Pages          | Edit       |
| Account         | Workers R2 Storage        | Edit       |
| Account         | Workers KV Storage        | Edit       |
| Account         | Account Settings          | Read       |

**Account resources:** Include → select *your personal account only*
(`lfernando.rramos@gmail.com`). Do NOT select "All accounts".

**Zone resources:** Leave at the default ("Include — All zones") OR set to
"None". Staging and production (when it goes live) both use
`*.workers.dev` / `*.pages.dev`, so no zone-level access is required
at this stage. Add a zone-specific permission only when a custom domain
is attached (tracked as a future cycle task).

**TTL:** Set an expiry date 90 days from creation. Add a calendar reminder
to rotate the token before it expires. Rotation procedure:
1. Create a new token with identical scopes.
2. Update the `CF_API_TOKEN` GitHub secret.
3. Revoke the old token.

Do NOT grant "Account — All" or "All zones, all accounts" — those are
over-scoped.

---

## 3. Add GitHub Actions secrets

Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

| Secret name    | Value                                    | Notes                                  |
|----------------|------------------------------------------|----------------------------------------|
| `CF_API_TOKEN` | (the token you just created)             | Treat as a password; never log it.     |
| `CF_ACCOUNT_ID`| `4105f6b01897184bf93014d65f1a60f7`       | Not sensitive, stored here for symmetry.|
| `STAGING_CLERK_PUBLISHABLE_KEY` | `pk_test_...`           | Required for staging SPA build.        |

---

## 4. Add GitHub Actions variable (after first deploy)

The SPA build needs to know the Worker's staging URL. Set once per repo:

| Variable name                  | Value                                                          |
|--------------------------------|----------------------------------------------------------------|
| `STAGING_API_BASE_URL`         | `https://billi-api-staging.lfernando-rramos.workers.dev`       |

Set via: **Settings → Secrets and variables → Actions → Variables → New repository variable** (or `gh variable set STAGING_API_BASE_URL --body='<url>' --repo luci-efe/billi`).

The subdomain `lfernando-rramos` is the workers.dev subdomain bound to the personal Cloudflare account `4105...`. It does not change between deployments. Until this variable is set, the SPA builds with an empty `VITE_API_BASE_URL`, which is safe for a first-boot smoke test but means every `/api/*` fetch from the browser 404s.

---

## 5. One-time Pages project creation

Run once from a machine authenticated to the Cloudflare account:

```bash
wrangler pages project create billi-web-staging --production-branch=dev
```

This registers the Pages project under your account. `deploy-web` uses
`--project-name=billi-web-staging`, so this must exist before the first
deploy.

**Why `--production-branch=dev`, not `main`?** Cloudflare Pages reserves
the bare project URL (`billi-web-staging.pages.dev`) for the project's
configured production branch. Since this project is the *staging* project
and we deploy to `dev`, the production branch of the staging project is
`dev`. Future production deployments will live in a **separate** Pages
project (`billi-web-production`) whose own production branch will be
`main` — same naming convention, different concern.

If a Pages project was already created with `production-branch=main`, flip
it in the dashboard: **Workers & Pages → billi-web-staging → Settings →
Builds & deployments → Production branch → `dev` → Save**. Cloudflare
does not auto-promote existing deployments on branch change, so trigger
one new push to `dev` (or `workflow_dispatch` the deploy workflow); the
resulting deployment becomes the new production deployment and the bare
URL resolves within ~30 seconds.

---

## 5b. One-time R2 bucket for staging documents

The Worker binds an R2 bucket (`DOCUMENTS_BUCKET`) for uploaded source
documents (receipts, invoices, statements). Wrangler validates the binding
during `wrangler deploy --env staging` and aborts with a code `10000`
authentication error if either the bucket is missing or the API token
lacks the `Workers R2 Storage: Edit` scope.

Run once from a machine authenticated to the Cloudflare account:

```bash
wrangler r2 bucket create billi-documents-staging
```

Verify:

```bash
wrangler r2 bucket list | grep billi-documents-staging
```

When production goes live, repeat with `billi-documents-production`.

---

## 5c. One-time KV namespace for staging rate limiter

The Worker binds a KV namespace (`AI_CHAT_RATE_LIMIT`) for the rate limiter
on `/api/ai/chat` and `/api/capture`. The Worker's boot-time assertion in
`src/index.ts` refuses to start in `staging` / `production` if the binding
is missing — fail closed.

Create the namespace once:

```bash
wrangler kv namespace create AI_CHAT_RATE_LIMIT --env staging
```

The command prints a block like:

```toml
[[kv_namespaces]]
binding = "AI_CHAT_RATE_LIMIT"
id = "<32-char-hex-id>"
```

Copy the `id` value and paste it into `apps/api/wrangler.toml` replacing
the `REPLACE_WITH_STAGING_KV_ID` placeholder under `[[env.staging.kv_namespaces]]`.
Commit the change — the id is not a secret. The same applies to the
`production` env when it is activated (see §9).

---

## 6. One-time Turso staging database

Staging should use a **separate** Turso database from development to avoid
data contamination.

```bash
turso db create billi-staging
turso db tokens create billi-staging
```

Note the database URL and token — you will need them in step 7.

---

## 7. Set Worker secrets for staging

Run these commands locally (NOT in CI — the workflow never touches secrets):

```bash
wrangler secret put CLERK_SECRET_KEY     --env staging
wrangler secret put TURSO_DATABASE_URL   --env staging
wrangler secret put TURSO_AUTH_TOKEN     --env staging
wrangler secret put OPENROUTER_API_KEY   --env staging
```

Each command prompts you to paste the value. Press Enter to confirm.

For `TURSO_DATABASE_URL`, use the URL returned by `turso db show billi-staging`
(format: `libsql://<db-name>.turso.io`).
For `TURSO_AUTH_TOKEN`, use the token from step 6.
For `CLERK_SECRET_KEY`, use the staging Clerk secret key from the Clerk dashboard.
For `OPENROUTER_API_KEY`, use the key from openrouter.ai.

---

## 8. Discover staging URLs after first deploy

After the first successful workflow run:

**Worker URL:**
```
https://billi-api-staging.lfernando-rramos.workers.dev
```
Health check: `/health` returns `{"ok":true,"service":"billi-api"}`.

**SPA (Pages) URLs:**
- `https://billi-web-staging.pages.dev` — canonical staging URL (serves
  whatever is deployed from `dev`, since `dev` is the project's production
  branch).
- `https://dev.billi-web-staging.pages.dev` — branch alias (same deployment,
  explicit branch-scoped URL; useful while Cloudflare propagates the
  production-pointer with a brief delay after a deploy).
- `https://<commit-sha>.billi-web-staging.pages.dev` — per-commit preview.

Both URLs appear in the **GitHub Actions job summary** of each deployment run
(click the run → expand the job summary).

---

## 9. Production activation checklist (future cycle)

The `deploy-production.yml` workflow is currently inert. To activate it:

- [ ] Register the production domain.
- [ ] Create a Cloudflare zone for the domain.
- [ ] Uncomment `[[env.production.routes]]` in `apps/api/wrangler.toml` and
      set the correct `pattern` and `zone_name`.
- [ ] Run `wrangler pages project create billi-web-production --production-branch=main`.
- [ ] Add a `PRODUCTION_API_BASE_URL` GitHub Actions variable.
- [ ] Uncomment the deploy steps in `deploy-production.yml`.
- [ ] Set production secrets: `wrangler secret put <NAME> --env production` for
      each of the four runtime secrets.
- [ ] Run `wrangler r2 bucket create billi-documents-production` (mirrors §5b).
- [ ] Run `wrangler kv namespace create AI_CHAT_RATE_LIMIT --env production` and
      paste the returned id into `[[env.production.kv_namespaces]]` in
      `apps/api/wrangler.toml`, replacing `REPLACE_WITH_PRODUCTION_KV_ID` (mirrors §5c).
- [ ] Token rotation: verify the CF API token has zone-edit permissions if DNS
      management is needed.

---

## 10. Token rotation reminder

The `CF_API_TOKEN` was created with a 90-day TTL. Set a calendar reminder for:

```
<creation date> + 90 days
```

Rotation steps:
1. Create a new token (same scopes as §2).
2. Go to **Settings → Secrets and variables → Actions** and update `CF_API_TOKEN`.
3. Verify a deploy succeeds.
4. Revoke the old token in the Cloudflare dashboard.
