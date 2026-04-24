---
id: CI-03
title: "CI-03: Conflict & quality detection tooling (Dependabot, CodeQL, Semgrep, gitleaks, Husky)"
cycle: 1
epic: OPS
milestone: MS-01
estimate: M (3 points)
priority: High
status: Todo
owner: Fernando
linear_url: (not yet filed)
git_branch: ci-03-conflict-detection-tooling
blocked_by:
  - CI-01
blocks: []
depends_on_adr: []
---

# CI-03 — Conflict & quality detection tooling

## 1. Purpose

CI-01 guards *our* code (lint, typecheck, build). CI-03 guards the rest of the supply chain: vulnerable transitive dependencies (Dependabot), semantic security bugs in our diffs (CodeQL + Semgrep), accidentally committed secrets (gitleaks — both on CI and pre-commit via Husky), and commit-message hygiene (Husky + commit-msg hook). These are cheap, high-signal gates; not shipping them is negligence once real user data flows through staging.

Every tool here is a **blocking gate on high-severity findings** and a **non-blocking signal on low-severity**. Noise is worse than no tool — all severity thresholds are explicit below.

---

## 2. Scope Boundaries

### In scope

- `.github/dependabot.yml` — weekly scans, grouped minor/patch PRs for `npm` (Bun lockfile is npm-ecosystem compatible), `github-actions` ecosystem for `.github/workflows/`. Package ecosystem entries per workspace (`/`, `/apps/web`, `/apps/api`, `/packages/db`) to respect workspace boundaries.
- `.github/workflows/codeql.yml` — default CodeQL config, languages: `javascript-typescript`. Runs on PR (`opened`, `synchronize`, `reopened`) and weekly cron. `security-events: write` permission.
- `.github/workflows/semgrep.yml` — `returntocorp/semgrep-action@<sha>` with `config: p/ci p/owasp-top-ten p/typescript`. Runs on PR. **Blocks** PR on findings of severity `ERROR`; posts `WARNING` findings as annotations only. Respects any `.semgrepignore` committed at repo root.
- `.github/workflows/gitleaks.yml` — `gitleaks/gitleaks-action@<sha>` full-history scan on PR and weekly scheduled scan on `dev`.
- **Husky 9+** hooks under `.husky/`:
  - `pre-commit`: `gitleaks protect --staged --redact --verbose` AND `bunx lint-staged`.
  - `commit-msg`: Conventional Commits check via a tiny shell regex (zero dependency).
- `lint-staged` config in root `package.json`: run `eslint --fix` on staged `*.{ts,tsx,js,jsx}` paths per workspace, and `prettier --write` if Prettier is later added. Safe no-op if no staged files match.
- `package.json` root: add `"prepare": "husky"` so `bun install` installs hooks automatically.
- **Semgrep plugin skill** alignment: repo already has the `semgrep` plugin available locally via the skill pack — the CI workflow uses the SaaS action, not the local skill. These are complementary (local = dev-time, CI = enforcement).

### Out of scope

- Snyk, Trivy, OSV-scanner — not adding more scanners. Dependabot + CodeQL + Semgrep covers the scope.
- SAST for non-JS/TS languages (repo is single-language).
- Signed commits enforcement (`commit.gpgsign`). If the user wants it later, it's a 2-line commit hook; not in this slice.
- License scanning (FOSSA/ScanCode). Future slice.
- Custom Semgrep rules written in this slice — use stock `p/ci`, `p/owasp-top-ten`, `p/typescript` only.

---

## 3. Acceptance Criteria

### AC-1 — Dependabot opens grouped PRs weekly
> Given the repo has `.github/dependabot.yml` committed,
> When the scheduled day arrives,
> Then Dependabot opens at most one PR per ecosystem per workspace with grouped minor/patch updates,
> And PRs are labeled `dependencies` and `automerge-candidate`.

### AC-2 — CodeQL runs on PR and weekly
> Given a PR is opened,
> Then `codeql.yml` runs and uploads SARIF results;
> And a scheduled run fires weekly on `dev`.

### AC-3 — Semgrep blocks ERROR-severity findings
> Given a PR introduces code matching a Semgrep rule at severity `ERROR`,
> Then the `semgrep` check fails with the rule name, file, and line number surfaced on the PR.
> Given a PR introduces code matching severity `WARNING`,
> Then the check passes but an annotation is posted to the PR.

### AC-4 — gitleaks blocks committed secrets
> Given a PR contains a string matching any gitleaks rule (e.g. `AKIA...`, `sk_live_`, `pk_live_`, Clerk keys, Turso auth tokens),
> Then the `gitleaks` check fails with the rule name and a redacted snippet.

### AC-5 — Husky pre-commit runs locally
> Given a developer stages a file containing `sk_live_fake123…`,
> When they run `git commit`,
> Then the commit is rejected with a gitleaks error pointing at the line.

### AC-6 — Husky commit-msg enforces Conventional Commits
> Given a developer runs `git commit -m "fixed stuff"`,
> Then the commit is rejected with a message pointing at the Conventional Commits spec.
> Given `git commit -m "feat(api): add /api/me upsert"`,
> Then the commit succeeds.

### AC-7 — No `--no-verify` escape hatch
> Given project documentation is searched,
> Then there is no instruction to use `git commit --no-verify` except in a clearly-flagged emergency-recovery context.

### AC-8 — Action pinning
> All `uses:` references in CI-03 workflows pinned to 40-char SHA with `# vX.Y.Z` comment.

---

## 4. Data Contracts

### 4.1 `.github/dependabot.yml` (sketch)

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly", day: "monday", time: "07:00", timezone: "America/Mexico_City" }
    open-pull-requests-limit: 5
    labels: [dependencies, automerge-candidate]
    groups:
      minor-and-patch:
        applies-to: version-updates
        update-types: [minor, patch]
  - package-ecosystem: "npm"
    directory: "/apps/web"
    schedule: { interval: "weekly" }
    groups: { minor-and-patch: { applies-to: version-updates, update-types: [minor, patch] } }
  - package-ecosystem: "npm"
    directory: "/apps/api"
    schedule: { interval: "weekly" }
    groups: { minor-and-patch: { applies-to: version-updates, update-types: [minor, patch] } }
  - package-ecosystem: "npm"
    directory: "/packages/db"
    schedule: { interval: "weekly" }
    groups: { minor-and-patch: { applies-to: version-updates, update-types: [minor, patch] } }
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: { interval: "weekly" }
```

### 4.2 Husky layout

```
.husky/
├── pre-commit     # runs: gitleaks protect --staged --redact && bunx lint-staged
├── commit-msg     # runs: bash script validating Conventional Commits regex
└── _/             # Husky internals (created by `husky init`)
```

### 4.3 Conventional Commits regex (commit-msg hook)

```
^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9\-]+\))?!?: .{1,100}$
```

### 4.4 Root `package.json` additions

```jsonc
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "apps/web/**/*.{ts,tsx,js,jsx}": ["eslint --fix"],
    "apps/api/**/*.ts": ["eslint --fix"],
    "packages/db/**/*.ts": ["eslint --fix"]
  },
  "devDependencies": {
    "husky": "^9.x",
    "lint-staged": "^15.x"
  }
}
```

Specific version pins are the agent's responsibility — fetch **latest official release** via WebFetch and pin to the exact `^X.Y.Z` current at authoring time.

---

## 5. Files Created / Modified

| File | Action | Purpose |
|---|---|---|
| `.github/dependabot.yml` | Create | Weekly dependency + actions updates |
| `.github/workflows/codeql.yml` | Create | CodeQL SAST |
| `.github/workflows/semgrep.yml` | Create | Semgrep with ERROR-blocks policy |
| `.github/workflows/gitleaks.yml` | Create | Secret scanning on PR + scheduled |
| `.husky/pre-commit` | Create | gitleaks + lint-staged |
| `.husky/commit-msg` | Create | Conventional Commits validator |
| `package.json` (root) | Modify | Add `prepare`, `lint-staged`, husky + lint-staged devDeps |
| `.gitleaks.toml` | Create (optional) | Project-specific allowlist (e.g. `*.example` files with placeholder keys) |
| `.semgrepignore` | Create | Ignore `node_modules/`, `dist/`, `.wrangler/`, generated migrations |
| `docs/ops/pre-commit-hooks.md` | Create | 2-paragraph explanation of why hooks exist + how to diagnose a failed hook (NOT how to bypass) |

---

## 6. Test Plan

| # | Test | Assertion |
|---|---|---|
| S-01 | Workflow YAML syntax | `actionlint` reports zero errors for all three new workflows |
| S-02 | SHA pinning | Every `uses:` in the new workflows has a 40-char SHA + version comment |
| S-03 | gitleaks catches a pasted fake key in a PR | Open a branch adding `CLERK_SECRET_KEY=sk_test_fake_` to a tracked file; assert `gitleaks` check fails |
| S-04 | gitleaks allowlists example files | Verify `.dev.vars.example` can contain placeholder like `CLERK_SECRET_KEY=sk_test_placeholder_...` without a gitleaks hit (via `.gitleaks.toml` allowlist entry scoped to `**/*.example`) |
| S-05 | Semgrep blocks ERROR rule | Introduce a pattern caught by `p/owasp-top-ten` at ERROR severity; assert `semgrep` check fails |
| S-06 | Semgrep warns but passes on WARNING | Introduce a WARNING-severity match; assert annotation posted but check green |
| S-07 | CodeQL runs | First PR after merge shows CodeQL status check with SARIF uploaded |
| S-08 | Dependabot config parses | `dependabot-preview` / `gh api` dependabot config validator returns OK |
| S-09 | Husky pre-commit blocks fake secret | Stage a file with `sk_live_FAKE` → `git commit` rejects |
| S-10 | Husky commit-msg blocks bad title | `git commit -m "update"` rejects; `git commit -m "chore(ci): add gitleaks"` accepts |

---

## 7. Verify — PASS/FAIL Checklist

- [ ] `.github/dependabot.yml` parses and covers all four npm directories + github-actions.
- [ ] Three new workflows exist and pass `actionlint`.
- [ ] Every `uses:` pinned by SHA with `# vX.Y.Z` comment.
- [ ] Semgrep workflow fails on ERROR, annotates on WARNING (confirmed by test S-05 / S-06).
- [ ] gitleaks workflow fails on a staged fake secret (S-03) and allows example files (S-04).
- [ ] `.husky/pre-commit` runs gitleaks and lint-staged; rejects fake-secret commit locally.
- [ ] `.husky/commit-msg` enforces Conventional Commits regex (§4.3).
- [ ] Root `package.json` has `"prepare": "husky"` so `bun install` idempotently installs hooks.
- [ ] `.gitleaks.toml` (if used) is minimal, scoped to `*.example` files only; does NOT blanket-ignore directories.
- [ ] `.semgrepignore` excludes generated/vendor paths only; no code source excluded.
- [ ] `docs/ops/pre-commit-hooks.md` exists and does NOT document `--no-verify`.

---

## 8. Security Checklist

- [ ] All three workflows use `permissions:` scoped minimally:
  - CodeQL: `security-events: write, contents: read, actions: read`.
  - Semgrep: `contents: read, pull-requests: write` (for annotations).
  - gitleaks: `contents: read, pull-requests: write`.
- [ ] `pull_request_target` NOT used in any of the three.
- [ ] gitleaks full-history scan is scheduled weekly on `dev`; not just PR-scoped.
- [ ] Dependabot PRs are labeled; automerge decisions are manual (no `auto-merge` action wired in this slice).
- [ ] No CI-03 workflow invokes a shell script fetched from a URL at runtime.

---

## 9. Operator Handoff

After this slice lands:

1. Go to **Settings → Code security and analysis** on https://github.com/luci-efe/billi and ensure **Dependency graph** and **Dependabot alerts** are enabled (they are by default for public repos; confirm for private).
2. Verify **CodeQL** appears under the same page after the first run.
3. Add CI-03 status checks to the required-checks list in branch protection (alongside CI-01's checks).

No secrets or tokens are required for CI-03 — all three scanners use the default `${{ github.token }}`.

---

## 10. Open Questions

1. **Prettier adoption.** If the team wants automated formatting, `lint-staged` should also call `prettier --write`. Deferred to a later slice — adding Prettier now is a style-churn minefield. Document the deferral in `docs/ops/pre-commit-hooks.md`.
2. **Custom Semgrep rules** (e.g. "no `fetch()` without `credentials: 'include'` to `/api/*`"). Deferred; stock packs cover 95% of the value.
3. **Gitleaks custom patterns** for Clerk (`sk_live_clerk_…`, `pk_live_clerk_…`) and Turso auth tokens. Verify the stock gitleaks ruleset covers these; if not, add two patterns to `.gitleaks.toml`.
