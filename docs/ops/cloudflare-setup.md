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

| Category        | Resource               | Permission |
|-----------------|------------------------|------------|
| Account         | Workers Scripts        | Edit       |
| Account         | Cloudflare Pages       | Edit       |
| Account         | Account Settings       | Read       |

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

---

## 4. Add GitHub Actions variable (after first deploy)

The SPA build needs to know the Worker's staging URL. This URL is only
discoverable after the first `deploy-api` job runs.

**Step A — run `deploy-api` first** (via a push to `dev` or `workflow_dispatch`).

**Step B — find the URL** in the Wrangler deploy output (something like
`https://billi-api-staging.<subdomain>.workers.dev`). You can also run:

```bash
wrangler deploy --env staging --dry-run 2>&1 | grep workers.dev
```

**Step C — set the variable:**

Navigate to: **Settings → Secrets and variables → Actions → Variables → New repository variable**

| Variable name          | Value example                                          |
|------------------------|--------------------------------------------------------|
| `STAGING_API_BASE_URL` | `https://billi-api-staging.<subdomain>.workers.dev`    |

Until this variable is set, the SPA builds with an empty `VITE_API_BASE_URL`,
which is safe for a first-boot smoke test (the proxy falls back to
`/api` on localhost; on staging it simply won't resolve). Set it before
inviting any testers.

---

## 5. One-time Pages project creation

Run once from a machine authenticated to the Cloudflare account:

```bash
wrangler pages project create billi-web-staging --production-branch=main
```

This registers the Pages project under your account. The `deploy-web` job in
`deploy-staging.yml` uses `--project-name=billi-web-staging`, so this must
exist before the first deploy.

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
https://billi-api-staging.<subdomain>.workers.dev
```
The exact `<subdomain>` is your workers.dev subdomain, visible in:
- The `deploy-api` job output (Wrangler prints the full URL).
- The Cloudflare Workers dashboard under "Preview URL".
- `wrangler deploy --env staging` output locally.

**SPA (Pages) URL:**
```
https://billi-web-staging.pages.dev
```
Per-commit preview URLs follow the pattern:
```
https://<commit-sha>.billi-web-staging.pages.dev
```

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
