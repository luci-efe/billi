# AGENTS.md — Billi

This file follows the [agents.md](https://agents.md) convention: provider-neutral guidance for any AI coding agent (Cursor, Aider, Cline, Continue, OpenAI/Codex, Gemini CLI, etc.) operating in this repository.

For Claude Code specifically, see [`CLAUDE.md`](CLAUDE.md). The two files are kept in sync; CLAUDE.md adds Claude-only details (subagent orchestration patterns, basic-memory MCP, BMad skill invocation). Everything below applies to all agents.

## Project at a glance

- **Product:** Billi — personal-finance web app for the Mexican market.
- **Phase:** MVP implementation, 4 weekly cycles, **2026-04-20 → 2026-05-17**.
- **Backlog:** 21 stories tracked as `BIL-*` issues in Linear team `BIL`.
- **Source-of-truth docs:** `docs/planning/{prd,architecture,ux-design-specification,epics}.md`.

Read [`README.md`](README.md) for product context, [`LINEAR.md`](LINEAR.md) for the issue map.

## Stack

- React 19 + Vite + TypeScript + shadcn/ui
- Cloudflare Pages + Workers (Pages Functions) + R2 + Workflows
- Turso (libSQL) + Drizzle ORM
- Better Auth (Drizzle adapter)
- Mastra + OpenRouter
- Dodo Payments

## Workflow rules

**One slice at a time, SpecSafe loop:**

```
spec → tests (failing) → implementation → verify (PASS/FAIL) → complete
```

Verification is binary. On FAIL, loop back to implementation. Never advance on partial pass.

**Pull from Linear, not from intuition.** Every change should map to a `BIL-*` issue. If you can't name the issue, either find it in Linear or ask before writing code.

## Architectural invariants

These are locked in `docs/planning/architecture/`. Don't violate them without an ADR:

1. **Deterministic vs generative split.** Financial math = SQL. LLM proposes, user confirms, BFF persists.
2. **Binaries → R2, metadata → Turso.** Never embed blobs in SQL.
3. **Ownership server-side.** Never trust client-supplied user IDs.
4. **Two-route chatbot.** Personal-history = SQL; educational = RAG over corpus. Every assistant feature must have a fallback path.
5. **Premium gates** resolved on both backend (authoritative) and frontend (UX). Defense in depth.
6. **`transactions.source`** enum: `form`, `text`, `voice`, `image`, `chat`. Don't extend without a story.

## Conventions

- **Branch naming:** `bil-<n>-<kebab-case-title>` (Linear provides this as `gitBranchName`).
- **Commit messages:** English, imperative mood (`Add`, `Fix`, `Refactor`). Reference the issue: `BIL-N: <subject>`.
- **PR title:** `BIL-N: <subject>`. PR body must paste the acceptance criteria from the linked Linear issue.
- **Code, comments, identifiers, internal docs:** English.
- **User-facing strings, product copy, error messages:** Spanish (Mexico).
- **Tests live next to source** (`foo.ts` + `foo.test.ts`) unless framework convention dictates otherwise.

## Quality gates (pre-merge)

- Tests added/updated, all passing.
- Type check clean.
- Lint clean.
- Acceptance criteria from the linked Linear issue satisfied (paste in PR body).
- No secrets in diff. `.env*` and `wrangler.toml` not committed.
- If the change crosses an architectural boundary, ADR added/updated.

## Things to confirm with the human before doing

- Pushing to remote.
- Opening, closing, or merging a PR.
- Updating Linear issue state, assignee, scope, or descriptions.
- Destructive git operations (`reset --hard`, force push, branch deletion).
- Skipping hooks (`--no-verify`).
- Rotating or exposing secrets.

## Reference

- Latest official docs over training memory. Always check vendor docs/changelogs before integrating a library — versions move, defaults change.
- For library questions, prefer Context7 MCP if available, else fetch from the official source.
- For up-to-date Cloudflare/Turso/Drizzle/Better Auth/Mastra patterns, fetch the current docs at the moment of use.
