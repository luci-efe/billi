---
id: BIL-13
title: "ST-04-01: Curación e ingestión del corpus RAG"
cycle: 1
epic: EP-04
milestone: MS-03
estimate: L (5 points)
priority: High
status: Todo
owner: Fernando
linear_url: https://linear.app/billi/issue/BIL-13
git_branch: eduardolalo1999/bil-13-st-04-01-curacion-e-ingestion-del-corpus-rag
blocked_by:
  - BIL-4
blocks: []
depends_on_adr:
  - AD-01
  - AD-04
  - AD-06
spillover_risk: HIGH
proposed_split:
  cycle_1: "Schema + ingest pipeline + one sample topic end-to-end"
  cycle_2: "Curate remaining 19 topics + ops playbook + retrieval threshold tuning"
---

# BIL-13 — Curación e ingestión del corpus RAG (spec slice)

## 1. Purpose and spillover framing

The educational RAG corpus is the substrate the assistant uses when a user asks a generic finance question ("¿qué es el CAT?", "¿cómo me afecta el Buró de Crédito?"). Per AD-06, the chat separates money-questions (deterministic SQL on the user's own ledger) from educational questions (retrieval over this curated corpus). Without this corpus, the educational half of the chat is either silent or ungrounded — both failure modes for a product promising contextual local help.

**Spillover analysis (explicit, load-bearing).** Cycle 1 ends 2026-04-27. Today is 2026-04-24. This slice is L=5 and combines three distinct workstreams: (1) database scaffolding (schema + migration), (2) content curation (finding, vetting, licensing, writing summaries for 20 Mexican finance topics), and (3) an embedding + ingest pipeline against OpenRouter. Workstream (2) alone is 1–2 days of research writing. Delivering all three in the remaining cycle budget is unrealistic without sacrificing quality on (2).

**Proposed split.** Cycle 1 ships what's irreversible and unblocks downstream work: the schema, the migration, the chunking + embedding + ingest pipeline, the retrieval query, and **one** fully-ingested sample topic (`sample-sat-basics`) that proves the pipeline end-to-end. Cycle 2 absorbs the 19 remaining topics as a curation-heavy task with a simpler "drop markdown in `content/rag/es/` and run the ingest script" ergonomic.

The Linear comment draft in §15 should be posted on BIL-13 before Cycle 1 retrospective so the scope change is documented.

## 2. Scope boundaries

**In scope (Cycle 1 sub-slice).**
- `rag_topics` + `rag_chunks` schema and migration.
- Recursive character chunker utility (500 target tokens, 50 overlap).
- Embedding function calling OpenRouter (`text-embedding-3-small`, 1536-dim).
- Ingest script `bun scripts/rag/ingest.ts --topic <slug>` (idempotent upsert).
- Retrieval function `retrieveTopK(query, k=5, lang='es')` with similarity threshold.
- One sample topic `sample-sat-basics` curated and ingested.
- Tests with mocked OpenRouter.

**Out of scope.**
- 19 remaining topic curations (Cycle 2).
- Admin UI for corpus management.
- Re-embedding orchestration on model change.
- Freshness / staleness policy.
- Chat integration (separate slice, blocked on this one).
- Non-Spanish content.

## 3. Acceptance criteria (expanded Gherkin)

- **AC-1.** Given a valid topic file `content/rag/es/sample-sat-basics.md`, when `bun scripts/rag/ingest.ts --topic sample-sat-basics` runs, then N chunk rows are written to `rag_chunks` where N ≥ 1 and every row has non-null `embedding`, `topic_slug = "sample-sat-basics"`, `source_url`, `source_title`.
- **AC-2.** Given the sample topic is ingested, when `retrieveTopK("¿qué es el SAT?", 3, "es")` is invoked, then at least 1 result is returned, each result includes `{ chunk_text, source_title, source_url, similarity }`, and the top result has similarity ≥ threshold (see §12 for threshold value).
- **AC-3.** Given the same topic is ingested a second time with identical content, when the script runs, then no duplicate rows are created; rows with matching `(topic_slug, chunk_index)` are upserted in place.
- **AC-4.** Given a chunk row, when queried, then its `source_url`, `source_title`, `source_published_at`, and `embedding_model` columns are all populated (traceability requirement from Linear AC).
- **AC-5.** Given a topic file is missing required frontmatter (e.g. no `source_url`), when ingest runs, then the script exits non-zero with a clear error naming the missing field; no partial rows are written.
- **AC-6.** Given a Spanish query, when retrieval runs with `lang='es'`, then only chunks with `lang='es'` are returned (guards against future multilingual corpus).
- **AC-7.** Given OpenRouter returns a 429, when the embed function is called, then it retries with exponential backoff up to 3 attempts before failing the ingest.

## 4. Schema (Drizzle, libSQL with vector extension)

```ts
// packages/db/src/schema/rag.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const ragTopics = sqliteTable("rag_topics", {
  slug: text("slug").primaryKey(),            // e.g. "sample-sat-basics"
  title: text("title").notNull(),
  summary: text("summary"),                   // short blurb shown in citations
  lang: text("lang").notNull().default("es"),
  sourceUrl: text("source_url").notNull(),
  sourcePublishedAt: integer("source_published_at"),
  license: text("license"),                   // e.g. "public-domain" | "cc-by-4.0"
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
});

export const ragChunks = sqliteTable(
  "rag_chunks",
  {
    id: text("id").primaryKey(),              // ULID
    topicSlug: text("topic_slug").notNull().references(() => ragTopics.slug, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    lang: text("lang").notNull().default("es"),
    embeddingModel: text("embedding_model").notNull(),  // e.g. "text-embedding-3-small"
    // F32_BLOB is Turso's fixed-size float32 vector type
    embedding: text("embedding").notNull(),   // typed as text in Drizzle; stored as F32_BLOB(1536) via raw SQL in migration
    tokenCount: integer("token_count"),
    createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    topicChunkUq: index("rag_chunks_topic_chunk_uq").on(t.topicSlug, t.chunkIndex), // UNIQUE via migration
    langIdx: index("rag_chunks_lang_idx").on(t.lang),
  })
);
```

> Drizzle does not yet type libSQL's `F32_BLOB`. The column is declared `text` at the Drizzle layer; the migration overrides the column type and adds the vector index.

## 5. Migration

`packages/db/migrations/0003_rag.sql`:

```sql
CREATE TABLE IF NOT EXISTS rag_topics (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  lang TEXT NOT NULL DEFAULT 'es',
  source_url TEXT NOT NULL,
  source_published_at INTEGER,
  license TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  topic_slug TEXT NOT NULL REFERENCES rag_topics(slug) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'es',
  embedding_model TEXT NOT NULL,
  embedding F32_BLOB(1536) NOT NULL,
  token_count INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS rag_chunks_topic_chunk_uq ON rag_chunks(topic_slug, chunk_index);
CREATE INDEX IF NOT EXISTS rag_chunks_lang_idx ON rag_chunks(lang);
-- Turso/libSQL vector index
CREATE INDEX IF NOT EXISTS rag_chunks_vec_idx ON rag_chunks(libsql_vector_idx(embedding));
```

> `libsql_vector_idx` is the current (2025+) libSQL syntax for a vector ANN index. Verify with `libsql --version` before applying in prod.

## 6. Ingest pipeline

Files:
- `scripts/rag/ingest.ts` — CLI entrypoint, parses `--topic <slug>`.
- `scripts/rag/chunk.ts` — recursive character splitter (500-token target, 50-token overlap, preserves sentence boundaries).
- `scripts/rag/embed.ts` — OpenRouter client wrapper with retry/backoff.
- `packages/db/src/repos/rag.ts` — `upsertTopic`, `upsertChunks`, `retrieveTopK`.
- `content/rag/es/<slug>.md` — source topic files (Spanish markdown with YAML frontmatter).

Flow:
1. Read `content/rag/es/<slug>.md`.
2. Parse frontmatter; validate required fields (`title`, `source_url`, `license`, `topic_slug`).
3. Upsert `rag_topics` row.
4. Split body into chunks with `chunk.ts`.
5. For each chunk, call `embed.ts` (batched 16 at a time, respecting OpenRouter rate limits).
6. Upsert `rag_chunks` rows by `(topic_slug, chunk_index)`.
7. Report counts (new, updated, unchanged).

## 7. Retrieval API

```ts
// packages/db/src/repos/rag.ts
export async function retrieveTopK(
  db: DrizzleDB,
  query: string,
  k: number = 5,
  lang: string = "es"
): Promise<Array<{ chunk_text: string; source_title: string; source_url: string; topic_slug: string; similarity: number }>>;
```

Under the hood: embed the query with the same model, then `SELECT … FROM rag_chunks JOIN rag_topics ON … WHERE lang = ? ORDER BY vector_distance_cos(embedding, ?) ASC LIMIT ?`. Filter results below `similarity >= SIMILARITY_THRESHOLD` (see §12).

## 8. Source curation template

`content/rag/es/<topic-slug>.md`:

```markdown
---
topic_slug: sample-sat-basics
title: "SAT: Qué es y para qué sirve"
source_url: https://www.gob.mx/sat
source_published_at: 2026-01-01
license: public-domain
summary: Introducción al Servicio de Administración Tributaria y sus funciones.
lang: es
---

# ¿Qué es el SAT?

El Servicio de Administración Tributaria (SAT) es el organismo…
```

Sample topic `sample-sat-basics` ships with Cycle 1.

## 9. Cycle-2 topic list (proposed, draft)

Non-exhaustive, subject to research: SAT obligaciones básicas, RFC (personas físicas), IMSS, Infonavit, CFE comprensión de recibo, Telmex facturación, Buró de Crédito, Score crediticio, Tarjetas de crédito revolventes, CAT, UDIs, Afore, Siefore, Créditos automotrices, Créditos hipotecarios, Fraudes financieros comunes en MX, LFPDPPP derechos ARCO, Banxico tasa de referencia, Inflación INPC, Condusef.

## 10. Test plan

Files under `scripts/rag/__tests__/` and `packages/db/src/repos/__tests__/`. Runner: Vitest.

1. `chunk.count.test.ts` — a 2000-token input produces expected chunk count with 50-token overlap.
2. `chunk.boundaries.test.ts` — splitter prefers sentence boundaries where possible.
3. `embed.retry.test.ts` — mocked 429 followed by 200 succeeds after retry.
4. `embed.max-retries.test.ts` — 3 consecutive 429s fails the call.
5. `ingest.idempotent.test.ts` — AC-3; running twice leaves the same row count.
6. `ingest.missing-frontmatter.test.ts` — AC-5.
7. `retrieve.topk.test.ts` — AC-2 with mocked embedding vector that deterministically matches sample.
8. `retrieve.lang-filter.test.ts` — AC-6.
9. `retrieve.threshold.test.ts` — below-threshold chunks are filtered out.
10. `migration.vector-index.test.ts` — migration DDL contains `libsql_vector_idx(embedding)`.

Integration test (opt-in, skipped in CI): `integration/rag.e2e.test.ts` runs real ingest against a dev Turso DB with a real OpenRouter key. Guarded by `RAG_INTEGRATION=1`.

## 11. Verify (PASS/FAIL)

- ☐ `bun test scripts/rag packages/db/src/repos` exits 0.
- ☐ Migration `0003_rag.sql` applies cleanly on a fresh DB.
- ☐ `bun scripts/rag/ingest.ts --topic sample-sat-basics` writes ≥ 1 chunk row.
- ☐ Manual: `retrieveTopK("¿qué es el SAT?", 3, "es")` from a REPL returns sensible chunks with similarity ≥ threshold.
- ☐ No OpenRouter API key appears in any log output (grep `CLOUDFLARE_LOG` / `wrangler tail`).
- ☐ Every chunk row has non-null `embedding_model`, `source_url`, `source_title`.
- ☐ Vector ANN index present (`.indexes rag_chunks` shows `rag_chunks_vec_idx`).

## 12. Cost, rate limits, threshold

**Embedding cost estimate.** `text-embedding-3-small` at OpenRouter pricing (~$0.02 per 1M tokens as of 2026-04). A 20-topic corpus averaging ~2000 tokens per topic is 40k input tokens ≈ $0.0008 total. Re-embedding is negligible.

**Rate limits.** OpenRouter free tier limits vary by upstream; batch 16 chunks per call, backoff on 429, honour `X-RateLimit-Reset` header.

**Similarity threshold.** Cosine similarity `>= 0.25` as initial floor (placeholder). Needs empirical tuning once the full corpus is in place — tracked as Cycle 2 work. Tuning method: curate 20 known-good question/chunk pairs, find the threshold that maximises F1.

## 13. LFPDPPP note

Corpus content is public educational material (government sites, Condusef, Banxico publications). No personal data stored. License column must be populated for every topic; topics with `all-rights-reserved` sources are rejected at ingest time (add a check in Cycle 2).

## 14. Open questions

1. **Re-embedding strategy on model change.** If we later swap to `text-embedding-3-large`, the existing 1536-dim vectors are unusable. Decision deferred to Cycle 2; proposed strategy: version the `embedding_model` column, coexist old + new vectors, retrieve from the active one.
2. **Similarity threshold.** 0.25 is a placeholder; empirical tuning is Cycle 2.
3. **Multilingual (English) support.** Out of scope for MVP; `lang` column exists to accommodate future English corpus.
4. **OpenRouter model availability.** Confirm `text-embedding-3-small` is reachable via OpenRouter at implementation time; fallback is direct OpenAI API with a different env var.
5. **License vetting process.** Who signs off that a source is reusable? Proposed: Fernando reviews each `content/rag/es/*.md` in PR before merging.

## 15. Linear comment draft (Spanish)

> **[Propuesta de scope change — BIL-13]**
>
> Al iniciar Ciclo 1 revisamos la estimación L=5 y el contenido real del trabajo. Curar 20 temas (investigación, licenciamiento, redacción de resúmenes) más montar la tubería de embeddings en 3 días compromete la calidad de ambos.
>
> Propongo dividir:
>
> - **Ciclo 1 (entregable):** schema `rag_topics`/`rag_chunks`, migración, script `ingest.ts`, función `retrieveTopK`, y **un tema de muestra** (`sample-sat-basics`) ingerido de punta a punta que valida el pipeline.
> - **Ciclo 2 (follow-up):** curación de los 19 temas restantes como sub-issues individuales, más tuning del umbral de similitud con 20 pares query/chunk conocidos.
>
> El spec completo está en `docs/specs/cycle-01/BIL-13-rag-corpus.md`. Actualizo la issue si confirman.
