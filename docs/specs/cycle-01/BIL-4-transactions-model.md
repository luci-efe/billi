---
id: BIL-4
title: "ST-02-01: Modelo base de transacciones"
cycle: 1
epic: EP-02
milestone: MS-01
estimate: M (3 points)
priority: Urgent
status: Todo
owner: Fernando
linear_url: https://linear.app/billi/issue/BIL-4
git_branch: eduardolalo1999/bil-4-st-02-01-modelo-base-de-transacciones
blocked_by:
  - BIL-2
blocks:
  - BIL-13
  - BIL-18
depends_on_adr:
  - ADR-003
  - AD-01
  - AD-06
---

# BIL-4 — Modelo base de transacciones (spec slice)

## 1. Purpose

This slice delivers the canonical ledger of user-originated financial movements. It is the table every later feature foreign-keys into: the dashboard aggregates from it, the chat grounds money-questions on it, the CSV export serialises from it, and the RAG layer cross-references topic suggestions against it. The ledger is deliberately write-restricted — per AD-06, only the Worker writes after validation; no LLM path can insert a row. This keeps the financial record deterministic and auditable.

The user-visible AC from Linear is narrow ("transactions are stored with type/amount/category/date/source, one owner per row"). The engineering AC is broader: the schema has to encode ownership at the SQL layer, amounts have to avoid float drift, the source enum has to be tight enough that later capture slices (form, text parse, voice, image OCR, chat) all land in a known bucket, and every query has to be index-backed.

## 2. Scope boundaries

**In scope.**
- `transactions` table schema and migration in `packages/db/`.
- Drizzle repository functions with `ownerId` as a required parameter.
- Hono endpoints `POST /api/transactions`, `GET /api/transactions`, `GET /api/transactions/:id`, `PATCH /api/transactions/:id`, `DELETE /api/transactions/:id`.
- Zod validation at the Worker boundary.
- Ownership enforcement at the SQL layer (not application layer alone).
- Unit + integration tests in the Worker package.

**Out of scope.**
- Capture UIs (form, text, voice, image, chat) — each is a later slice.
- R2 binary storage for receipt images — the `source_ref` column is added now but populated later.
- LLM extraction pipelines.
- Aggregations / dashboard reporting queries.
- Soft delete, archival, audit log table. MVP uses hard delete.
- Multi-currency conversion; `currency` is stored but not converted.

## 3. Acceptance criteria (expanded Gherkin)

Each AC maps to at least one test case in §10.

- **AC-1.** Given an authenticated POST to `/api/transactions` with body `{ type: "expense", amount_cents: 12500, currency: "MXN", category: "food", occurred_at: 1713916800, source: "form" }`, when the Worker handles it, then a row is inserted with `owner_id = auth.userId` and the response is `201` with `{ id: "<ulid>" }`.
- **AC-2.** Given user A owns transaction T, when user B issues `GET /api/transactions/T`, then the response is `404` (not `403` — existence must not leak).
- **AC-3.** Given user A has 120 rows and issues `GET /api/transactions?from=…&to=…&type=expense`, when the Worker handles it, then only user A's rows matching the filter are returned, ordered `occurred_at DESC, id DESC`, default page size 50, max `limit` 200.
- **AC-4.** Given an invalid `source` value (e.g. `"camera"`), when POST is made, then `400` with `{ error: "invalid_source", allowed: ["form","text","voice","image","chat"] }`.
- **AC-5.** Given `amount_cents <= 0`, when POST is made, then `400`. Amounts are always positive; sign is encoded by `type`.
- **AC-6.** Given user A owns T and sends `PATCH /api/transactions/T` with `{ category: "transport" }`, when the Worker handles it, then the row is updated, `updated_at` is set to now, and the response is `200` with the updated row.
- **AC-7.** Given user A owns T and sends `DELETE /api/transactions/T`, when the Worker handles it, then the response is `204` and a subsequent `GET` returns `404`.

## 4. Schema (Drizzle, libSQL)

```ts
// packages/db/src/schema/transactions.ts
import { sqliteTable, text, integer, check, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),                         // ULID, generated in Worker
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),                        // "income" | "expense"
    amountCents: integer("amount_cents").notNull(),       // > 0
    currency: text("currency").notNull().default("MXN"),  // ISO-4217
    category: text("category").notNull(),                 // length 1..32
    occurredAt: integer("occurred_at").notNull(),         // unix seconds
    source: text("source").notNull(),                     // form|text|voice|image|chat
    sourceRef: text("source_ref"),                        // future R2 key
    note: text("note"),                                   // length 0..280
    createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at"),
  },
  (t) => ({
    typeChk: check("transactions_type_chk", sql`${t.type} IN ('income','expense')`),
    amountChk: check("transactions_amount_chk", sql`${t.amountCents} > 0`),
    categoryLenChk: check("transactions_cat_len_chk", sql`length(${t.category}) BETWEEN 1 AND 32`),
    sourceChk: check(
      "transactions_source_chk",
      sql`${t.source} IN ('form','text','voice','image','chat')`
    ),
    noteLenChk: check("transactions_note_len_chk", sql`${t.note} IS NULL OR length(${t.note}) <= 280`),
    ownerTimeIdx: index("tx_owner_time_idx").on(t.ownerId, t.occurredAt),
    ownerCatIdx: index("tx_owner_cat_idx").on(t.ownerId, t.category),
    ownerTypeIdx: index("tx_owner_type_idx").on(t.ownerId, t.type),
  })
);
```

Column rationale:
- `id` ULID (lexically sortable, monotonic under contention) — justified in Open Questions vs UUIDv7.
- `amount_cents` integer to sidestep IEEE-754 rounding; MX pesos have 2 decimals so cents suffice.
- `type` separate from signed `amount` — queries like "total gastos del mes" become `SUM(amount_cents) WHERE type='expense'` instead of `SUM(CASE WHEN amount_cents < 0 THEN -amount_cents ELSE 0 END)`. More readable, more indexable.
- `occurred_at` integer unix seconds — SQLite's native clock type; avoids timezone ambiguity. Display layer formats in the user's locale.
- `source_ref` nullable now, used later to link R2 keys for receipt images / voice blobs (AD-05).
- Indexes cover the three common query shapes: by time range, by category, by type. All prefixed with `owner_id` so the index is ownership-scoped and the query plan short-circuits fast.

## 5. Migration

`packages/db/migrations/0002_transactions.sql` — generated by `drizzle-kit` from the schema. Committed with a literal copy below so tests can assert its presence and shape.

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'MXN',
  category TEXT NOT NULL CHECK (length(category) BETWEEN 1 AND 32),
  occurred_at INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('form','text','voice','image','chat')),
  source_ref TEXT,
  note TEXT CHECK (note IS NULL OR length(note) <= 280),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS tx_owner_time_idx ON transactions(owner_id, occurred_at);
CREATE INDEX IF NOT EXISTS tx_owner_cat_idx  ON transactions(owner_id, category);
CREATE INDEX IF NOT EXISTS tx_owner_type_idx ON transactions(owner_id, type);
```

## 6. Repository API

`packages/db/src/repos/transactions.ts`:

```ts
export interface NewTransaction { type: "income"|"expense"; amountCents: number; currency?: string; category: string; occurredAt: number; source: "form"|"text"|"voice"|"image"|"chat"; sourceRef?: string; note?: string; }
export interface ListFilter { from?: number; to?: number; type?: "income"|"expense"; category?: string; limit?: number; cursor?: string; }

export function createTransaction(db: DrizzleDB, ownerId: string, input: NewTransaction): Promise<{ id: string }>;
export function getTransactionById(db: DrizzleDB, id: string, ownerId: string): Promise<Transaction | null>;
export function listTransactions(db: DrizzleDB, ownerId: string, filter: ListFilter): Promise<{ items: Transaction[]; nextCursor?: string }>;
export function updateTransaction(db: DrizzleDB, id: string, ownerId: string, patch: Partial<NewTransaction>): Promise<Transaction | null>;
export function deleteTransaction(db: DrizzleDB, id: string, ownerId: string): Promise<boolean>;
```

Every function takes `ownerId` explicitly. Functions that would return a cross-owner row return `null` (and the Worker translates that to `404`). Pagination uses keyset on `(occurred_at DESC, id DESC)` via a base64-encoded cursor, not offset — stable under inserts.

## 7. HTTP surface

| Method | Path | Body | Response | Status codes |
|---|---|---|---|---|
| POST | `/api/transactions` | `NewTransaction` (zod) | `{ id }` | 201, 400, 401 |
| GET | `/api/transactions` | query filter | `{ items, nextCursor? }` | 200, 400, 401 |
| GET | `/api/transactions/:id` | — | `Transaction` | 200, 401, 404 |
| PATCH | `/api/transactions/:id` | `Partial<NewTransaction>` | `Transaction` | 200, 400, 401, 404 |
| DELETE | `/api/transactions/:id` | — | — | 204, 401, 404 |

## 8. Validation

`worker/src/schemas/transactions.ts` exports zod schemas: `newTransactionSchema`, `listFilterSchema`, `transactionIdParamSchema`. The Worker runs `schema.parse()` before any DB call. Parse errors are caught by Hono's error handler and mapped to `400 { error: "validation_failed", details }`.

## 9. Security checklist

- No raw SQL string interpolation; Drizzle parameterises.
- Ownership enforced by `owner_id = ?` in every query — no superuser path.
- Cross-owner access returns `404`, never `403` (existence non-leak).
- Error responses never echo the user input back.
- Deletes are hard; no soft-delete means no leaked tombstones.
- All PII (note content) kept out of structured logs.

## 10. Test plan

Files under `worker/src/routes/__tests__/` and `packages/db/src/repos/__tests__/`. Runner: Vitest + `@cloudflare/vitest-pool-workers`. Test DB: in-memory libSQL (`:memory:`) seeded via migration runner.

1. `tx-create.happy.test.ts` — AC-1 baseline insert.
2. `tx-create.invalid-source.test.ts` — AC-4.
3. `tx-create.invalid-amount.test.ts` — AC-5 (zero, negative).
4. `tx-create.invalid-category-length.test.ts` — 33-char category rejected.
5. `tx-create.note-max.test.ts` — 281-char note rejected.
6. `tx-create.default-currency.test.ts` — omitted currency defaults to MXN.
7. `tx-get.owner-scoped.test.ts` — AC-2 (user B gets 404 for user A's row).
8. `tx-list.ownership.test.ts` — only owner's rows returned.
9. `tx-list.filter-time.test.ts` — AC-3 time bounds inclusive.
10. `tx-list.filter-category.test.ts` — category filter exact.
11. `tx-list.ordering.test.ts` — DESC by `occurred_at`, tie-broken by `id` DESC.
12. `tx-list.pagination.test.ts` — cursor round-trip, `limit` capped at 200.
13. `tx-patch.owner-scoped.test.ts` — AC-6; user B patching user A's row returns 404.
14. `tx-patch.updated-at.test.ts` — `updated_at` is populated on patch.
15. `tx-delete.happy.test.ts` — AC-7; second delete is 404.
16. `tx-delete.cross-owner.test.ts` — user B cannot delete user A's row.
17. `migration.shape.test.ts` — reads `0002_transactions.sql` and asserts presence of every CHECK and INDEX (guards against silent schema drift).

## 11. Verify (PASS/FAIL)

- ☐ `bun test worker packages/db` exits 0.
- ☐ `bun run db:generate` produces `0002_transactions.sql` matching the literal in §5 (no drift).
- ☐ `bun run db:migrate` applies cleanly on a fresh DB.
- ☐ Manual: create two Clerk accounts in dev, each inserts a transaction via Postman; neither can read the other's row.
- ☐ `EXPLAIN QUERY PLAN` on the `list` query shows use of `tx_owner_time_idx`.
- ☐ No occurrence of `${` inside any `sql` template in repo functions (grep audit).
- ☐ Error responses contain `error` code only, never raw `note` content.

## 12. Performance

Per-user row count expected in the low thousands over a year. The three composite indexes cover the dominant query shapes. Full-text search on `note` is not in scope. A future slice may add FTS5 virtual table if needed.

## 13. LFPDPPP note

- **Art. 19** (data quality) — CHECK constraints enforce valid values.
- **Art. 21** (confidentiality) — ownership scoping at SQL layer.
- **Art. 22** (ARCO: access, rectification, cancellation, opposition) — GET/PATCH/DELETE satisfy access, rectification, and cancellation respectively. Opposition (opt-out of processing) is a user-level concern handled in BIL-1 consent flow.

## 14. Open questions

- **ULID vs UUIDv7?** ULID chosen for lexical sort and readability in URLs; UUIDv7 is marginally more standard but identical properties. Confirm with team before first migration.
- **Do we need a `tags` JSON column?** Proposed deferral — category covers MVP needs; tags is a premium-tier feature per PRD §10.
- **Currency scope.** Should non-MXN be rejected outright for MVP, or stored opaquely? Current spec stores opaquely with `CHECK` pending; flag for PM review.
