# CLAUDE.md — Billi repo guidance

These instructions apply when Claude Code (or any Claude-driven agent) operates in this repository. They override generic defaults; user instructions in conversation always override these.

## What this repo is

Billi is a personal-finance web app for the Mexican market. The MVP is being built across **4 weekly Linear cycles** starting **Mon 2026-04-20**, ending **Sun 2026-05-17**. All scope is locked in [`docs/planning/`](docs/planning/) and tracked as 21 stories in Linear team `BIL`.

Read [`README.md`](README.md) for product context. Read [`LINEAR.md`](LINEAR.md) for the issue map. Read [`docs/planning/architecture/`](docs/planning/architecture/index.md) before touching any code that crosses an architectural boundary.

## Workflow: SpecSafe loop, one slice at a time

For every Linear issue (`BIL-*`):

```
1. Spec        — restate the story + acceptance criteria; lock scope.
2. Tests       — write tests against the spec FIRST. They must fail.
3. Implement   — minimum code to make tests pass + satisfy AC.
4. Verify      — run tests; check security, quality, AC. Binary PASS/FAIL.
                  FAIL → loop back to step 3. Never advance on partial pass.
5. Complete    — mark Linear issue done, move to next slice.
```

This is non-negotiable. The discipline is the whole point — speed comes from never having to re-do a slice.

## Methodology stack

This repo ships with the **BMad-Method** skill pack under `.claude/skills/` (mirrored to `.agents/skills/` for non-Claude runners). 55 skills covering brainstorming, PRD/architecture/UX/epics authoring, dev story execution, code review, retrospective, etc.

- For new features mid-MVP: `bmad-create-story` → `bmad-dev-story`.
- For sprint-level coordination: `bmad-sprint-status`, `bmad-sprint-planning`.
- For mid-sprint scope changes: `bmad-correct-course`.
- For code review at slice boundaries: `bmad-code-review`.
- If a planning doc grows unwieldy: `bmad-shard-doc` to split by `##` sections.

Skill names map 1:1 to filenames in `.claude/skills/`.

## How to orchestrate

Per global working preferences: **always orchestrate, always verify**.

- Spawn subagents for substantive work (research, implementation, review). Don't do non-trivial work in-line.
- **Verify every subagent response before relaying** — code must run, tests must pass, claims must check against primary sources.
- **Sanitize subagent output** before writing into Linear/GitHub: decode HTML entities (`&amp;` → `&`, `&lt;` → `<`, etc.), check URLs, reject truncated code fences.
- **Always fetch latest official docs** (vendor sites, official changelogs) before recommending or integrating any library/SDK. Memory is not authoritative.
- Prefer **Sonnet 4.6** for routine spikes/implementation; reserve **Opus** for synthesis, architecture, and review.
- When spawning multiple independent subagents, send them in **one message** for parallelism.

## Stack & conventions

| Layer       | Stack                                                           |
|-------------|-----------------------------------------------------------------|
| Frontend    | React 19 · Vite · TypeScript · shadcn/ui                        |
| Hosting     | Cloudflare Pages                                                |
| API/BFF     | Cloudflare Workers / Pages Functions · Hono (recommended)       |
| Database    | Turso (libSQL) · Drizzle ORM · `@libsql/client`                 |
| Auth        | Better Auth with Drizzle adapter                                |
| Storage     | Cloudflare R2                                                   |
| Billing     | Dodo Payments                                                   |
| AI          | Mastra orchestration · OpenRouter as provider gateway           |
| Jobs        | Cloudflare Workflows                                            |
| Vector RAG  | Turso native vector search (no separate vector DB)              |

**Architectural rules locked in [`docs/planning/architecture/`](docs/planning/architecture/index.md):**

1. Separate deterministic financial logic from LLM generation. Never let the chatbot freely write to the ledger — it proposes, the user confirms, the BFF persists.
2. Binaries to R2, metadata to Turso. Never base64 a blob into SQL.
3. Ownership verified server-side on every operation; never trust client-supplied user IDs.
4. Two-route chatbot: SQL-deterministic for personal-history questions, RAG over corpus for educational questions. Each story involving the assistant must include a fallback path (`ST-04-05` / BIL-17 is the trazabilidad backbone).
5. Premium gates resolved on backend AND frontend (defense in depth). The backend is authoritative.
6. `transactions.source` enum: `form`, `text`, `voice`, `image`, `chat`. Don't add values without a story.

## Bilingual rules

- **Code, comments, commit messages, PR descriptions, internal docs (CLAUDE.md, AGENTS.md, ADRs):** English.
- **User-facing strings, product copy, error messages shown to users, marketing-facing docs:** Spanish (Mexico).
- **Planning artifacts in `docs/planning/`** are Spanish (sourced from the class deliverable). Treat them as source-of-truth as-is. New ADRs and technical specs you author should be English.

## Quality bar

Production-grade only. No half-baked merges, no "it works on my machine", no swallowing test failures. If something is incomplete, say so explicitly rather than declaring done. Hold subagent output to the same bar.

Pre-merge checklist for any PR:

- [ ] Tests added/updated and passing locally.
- [ ] Type check clean.
- [ ] Lint clean.
- [ ] Acceptance criteria from the linked Linear issue satisfied (paste them in the PR description).
- [ ] If the change crosses a boundary: ADR added or existing ADR updated.
- [ ] No secrets in diff. Verify `wrangler.toml` / `.env*` not committed.

## Things to never do without explicit user approval

- Push to remote.
- Open / close / merge a PR.
- Update a Linear issue's state, assignee, or scope (read is fine; write needs approval).
- Run destructive git operations (`reset --hard`, force push, branch delete).
- Skip hooks (`--no-verify`).
- Rotate or expose secrets.

## Memory

Two layers, both available:

- **Auto-memory** at `~/.claude/projects/<this-repo>/memory/` — per-repo facts, feedback, project state.
- **basic-memory MCP** vault at `~/obsidian-claude/` — cross-project knowledge. Search before substantial work; write durable learnings under `projects/billi/`, `decisions/`, `learnings/`.

When in doubt, write to both.

## When you start working

1. Read the Linear issue you're picking up (`BIL-N`).
2. Cross-reference the matching `ST-XX-XX` in `docs/planning/epics/` — it has the canonical AC.
3. Check `docs/planning/architecture/` for any architectural rule that touches your slice.
4. Run the SpecSafe loop. Don't skip steps.
5. When done, push to a branch named `bil-N-<kebab-case-title>` (Linear's gitBranchName already gives you this — use it).
