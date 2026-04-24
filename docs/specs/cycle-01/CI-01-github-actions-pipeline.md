---
id: CI-01
title: "CI-01: GitHub Actions CI pipeline (lint + typecheck + test + build)"
cycle: 1
epic: OPS
milestone: MS-01
estimate: M (3 points)
priority: High
status: Todo
owner: Fernando
linear_url: (not yet filed)
git_branch: ci-01-github-actions-pipeline
blocked_by: []
blocks:
  - CI-02
  - CI-03
depends_on_adr: []
---

# CI-01 — GitHub Actions CI pipeline

## 1. Purpose

Until we have automation, every PR is a manual gamble: typecheck drift, lint regressions, and broken bundles only surface at deploy time. This slice stands up the mandatory-check half of the pipeline so that **every PR** targeting `dev` or `main` is blocked from merge until install, lint, typecheck, and build are green across all three workspaces (`@billi/web`, `@billi/api`, `@billi/db`). Tests run as non-blocking today (no suites exist yet) and flip to blocking the moment a spec slice lands tests. The pipeline also enforces Conventional Commits on PR titles, catches Drizzle schema drift (schema edited without committed migration), and asserts that `.env*.example` templates stay in lockstep with runtime needs.

The discipline is: **if CI is red, the merge button is gone.** Branch protection (configured by the operator, not this slice) will consume these status checks.

---

## 2. Scope Boundaries

### In scope

- `.github/workflows/ci.yml` — single workflow, PR-scoped, running: install → lint → typecheck → test (non-blocking) → build dry-run (both apps).
- Bun install cached on `bun.lockb` hash.
- `.github/workflows/pr-title.yml` — Conventional Commits enforcement on PR title.
- `schema-drift` job inside `ci.yml`: runs `bun db:generate` and fails if `packages/db/migrations/` has uncommitted changes.
- `env-shape` job inside `ci.yml`: asserts the keys in `apps/api/.dev.vars.example` and `apps/web/.env.local.example` match a canonical list declared in the workflow, so a renamed/removed env var breaks the build until the example is updated.
- Every action pinned to a 40-char commit SHA with a `# vX.Y.Z` trailing comment.
- Workflow sets `permissions:` at the top scoped to `contents: read` (plus `pull-requests: write` only where needed for PR annotations) — never `write-all`.
- Concurrency group per PR so re-pushes cancel in-flight runs.

### Out of scope

- Staging/production deploys → CI-02.
- CodeQL / Semgrep / gitleaks / Dependabot / Husky → CI-03.
- Coverage reporting, perf budgets, visual regression → future slices.
- Branch protection rule creation (surfaced as operator steps, not automated here).

---

## 3. Acceptance Criteria

### AC-1 — Every PR runs CI
> Given a PR is opened, reopened, or synchronized against `dev` or `main`,
> When GitHub Actions receives the event,
> Then `ci.yml` runs and surfaces `lint`, `typecheck`, `build`, `schema-drift`, `env-shape`, `pr-title` as separate status checks.

### AC-2 — Typecheck and lint are blocking
> Given any of `lint`, `typecheck`, `build`, `schema-drift`, `env-shape`, `pr-title` fails,
> Then the PR check summary shows a red X for that job,
> And the run's exit code is non-zero.

### AC-3 — Tests are non-blocking today, with warning
> Given `bun run --filter '*' test` exits non-zero,
> Then the workflow continues (`continue-on-error: true`) and emits a warning annotation on the PR,
> And the job's status is neutral/skipped-shaped, not failure.

### AC-4 — Install is cached
> Given two CI runs in sequence without changes to `bun.lockb`,
> When the second run's install step executes,
> Then the cache is restored and `bun install --frozen-lockfile` completes in under 15 seconds on cache hit.

### AC-5 — Schema drift blocks merge
> Given a PR changes a file under `packages/db/src/schema/` without committing the corresponding SQL migration,
> When the `schema-drift` job runs `bun db:generate`,
> Then the job fails with a diff pointing at the missing/changed migration file.

### AC-6 — Env shape stays in sync
> Given a PR renames or removes a required env var without updating `apps/api/.dev.vars.example` or `apps/web/.env.local.example`,
> Then the `env-shape` job fails with a clear diff of expected vs. actual keys.

### AC-7 — PR title enforces Conventional Commits
> Given a PR titled `fixed stuff`,
> Then `pr-title` fails with a comment pointing at the Conventional Commits spec;
> Given a PR titled `feat(api): add /api/me`,
> Then `pr-title` passes.

### AC-8 — Action pinning
> Given any `uses:` line in a workflow file,
> Then it references a 40-char commit SHA followed by `# vX.Y.Z`,
> And `grep -E 'uses: .+@(v[0-9]+|main|master)$'` over `.github/workflows/` returns no matches.

---

## 4. Data Contracts

### 4.1 Canonical env key set (drives AC-6)

```yaml
# Declared inside ci.yml as a literal list checked against the example files.
apps_api_dev_vars:
  - CLERK_SECRET_KEY
  - TURSO_DATABASE_URL
  - TURSO_AUTH_TOKEN
  - OPENROUTER_API_KEY
apps_web_env_local:
  - VITE_CLERK_PUBLISHABLE_KEY
```

If a future slice adds a runtime secret, that slice must update this list AND the example files in the same commit.

### 4.2 Workflow trigger surface

- `pull_request: { branches: [dev, main], types: [opened, reopened, synchronize, ready_for_review] }`
- `workflow_dispatch:` (manual re-run from UI for flaky infra)

---

## 5. Files Created / Modified

| File | Action | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | Create | Main CI workflow (install + lint + typecheck + test + build + schema-drift + env-shape) |
| `.github/workflows/pr-title.yml` | Create | Conventional Commits check on PR title |
| `apps/api/package.json` | Modify | Replace `"lint": "echo 'lint: TODO'"` with a real linter command (ESLint 9 flat config shared-from-web or scoped) |
| `packages/db/package.json` | Modify | Same — replace stub lint with a real ESLint invocation |
| `apps/web/eslint.config.js` | Modify (optional) | Factor shared config into root if adopting a flat config monorepo pattern |

The linter for `api` and `db` may be a minimal ESLint config scoped to `**/*.ts` with `@typescript-eslint/recommended` — just enough to catch unused imports and dead code. Do NOT bolt on stylistic rules that will generate churn.

---

## 6. Test Plan

CI itself is the test target. Verification happens by opening a throwaway PR and observing the checks. Additionally:

| # | Test | Assertion |
|---|---|---|
| C-01 | Workflow YAML syntax | `actionlint` (run locally or via action) reports zero errors |
| C-02 | Action SHA pinning | `grep -E 'uses: .+@[0-9a-f]{40}' .github/workflows/*.yml` matches every `uses:` line; no tag/branch refs |
| C-03 | Lint fails PR | Push a commit with an unused import; verify `lint` turns red |
| C-04 | Typecheck fails PR | Push a commit with a TS error; verify `typecheck` turns red |
| C-05 | Schema drift fails PR | Edit a schema column type without committing a new migration; verify `schema-drift` turns red with readable diff |
| C-06 | Env shape fails PR | Remove a key from `.dev.vars.example`; verify `env-shape` turns red |
| C-07 | PR title fails on non-conventional | Title `update stuff`; verify `pr-title` turns red |
| C-08 | Cache warm path | Trigger two consecutive CI runs; second run's install duration < 15s |

---

## 7. Verify — PASS/FAIL Checklist

- [ ] `.github/workflows/ci.yml` and `.github/workflows/pr-title.yml` exist and pass `actionlint`.
- [ ] Every `uses:` references a 40-char SHA with `# vX.Y.Z` trailing comment.
- [ ] `permissions:` block is present at workflow top level and scoped minimally.
- [ ] `concurrency:` block cancels superseded runs per PR.
- [ ] `apps/api` and `packages/db` have real lint commands (not `echo 'lint: TODO'`).
- [ ] A throwaway PR shows six status checks (lint / typecheck / build / schema-drift / env-shape / pr-title) plus a non-blocking test annotation.
- [ ] Test failure does NOT fail the workflow today (AC-3).
- [ ] Cache hit on second run confirmed (AC-4).
- [ ] Operator handoff section below is present and copy-paste ready.

---

## 8. Security Checklist

- [ ] `permissions: contents: read` at workflow top level; no job widens beyond what it needs.
- [ ] No secrets referenced in `ci.yml` (CI should work on forks' PRs — any secret use would be a red flag).
- [ ] `pull_request_target` NOT used (that's the unsafe trigger that auto-grants secrets on fork PRs).
- [ ] Every third-party action pinned by SHA (supply-chain hygiene).
- [ ] No inline `curl | bash` or arbitrary script downloads in the workflow body.

---

## 9. Operator Handoff (branch protection, required checks)

After this workflow lands on `dev`:

```bash
# Example: require these checks on dev. Run after the first successful CI run exists so GitHub knows the check names.
gh api --method PUT repos/luci-efe/billi/branches/dev/protection \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]='lint' \
  -f required_status_checks.contexts[]='typecheck' \
  -f required_status_checks.contexts[]='build' \
  -f required_status_checks.contexts[]='schema-drift' \
  -f required_status_checks.contexts[]='env-shape' \
  -f required_status_checks.contexts[]='pr-title' \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f required_linear_history=true \
  -f enforce_admins=false
```

`main` gets the same treatment with `required_approving_review_count=2`.

---

## 10. Open Questions

1. Shared ESLint config vs per-workspace configs — adopting a root flat config shared across all three is cleaner but requires a small refactor. Default for this slice: per-workspace, upgrade later.
2. Whether to run CI on `dev` pushes as well as PRs, or rely on CD for that. Default: CI runs on PR only; CD on `dev` push owns the "is `dev` still green" signal.
