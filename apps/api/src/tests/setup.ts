/// <reference types="@cloudflare/vitest-pool-workers" />
// Helpers shared across the HTTP integration tests. We mock the OpenRouter
// REST surface via the cloudflare:test `fetchMock` (an undici MockAgent that
// intercepts outbound `fetch()` from the Worker).
import { env, fetchMock } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';
import type { Env } from '../env';

declare module 'cloudflare:test' {
  // Augment the worker pool's ProvidedEnv with the bindings declared in
  // vitest.config.ts so `env.TURSO_DATABASE_URL` typechecks here.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ProvidedEnv extends Env {}
}

const OPENROUTER_ORIGIN = 'https://openrouter.ai';

/** Build a 1536-dim float embedding deterministically. */
export function makeEmbedding(seed = 0): number[] {
  return Array.from({ length: 1536 }, (_, i) => ((i + seed) % 7) * 0.001);
}

/** Stop hitting the network — every outbound fetch must match an interceptor. */
export function activateFetchMock(): void {
  fetchMock.activate();
  fetchMock.disableNetConnect();
}

export function deactivateFetchMock(): void {
  fetchMock.assertNoPendingInterceptors();
  fetchMock.deactivate();
}

/** Stub `POST /api/v1/embeddings` with a synthetic 1536-dim embedding. */
export function mockEmbedding(times = 1, seed = 0) {
  fetchMock
    .get(OPENROUTER_ORIGIN)
    .intercept({ method: 'POST', path: '/api/v1/embeddings' })
    .reply(
      200,
      JSON.stringify({ data: [{ embedding: makeEmbedding(seed) }] }),
      { headers: { 'content-type': 'application/json' } },
    )
    .times(times);
}

/**
 * Stub `POST /api/v1/chat/completions`. The test passes the JSON object that
 * the Worker is expected to receive as `choices[0].message.content`. The
 * extractor inside the workflow does `JSON.parse(content)`, so the body must
 * round-trip through `JSON.stringify`.
 */
export function mockChatJSON(content: unknown, times = 1) {
  fetchMock
    .get(OPENROUTER_ORIGIN)
    .intercept({ method: 'POST', path: '/api/v1/chat/completions' })
    .reply(
      200,
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(content) } }],
      }),
      { headers: { 'content-type': 'application/json' } },
    )
    .times(times);
}


/**
 * Create the application schema in the miniflare-provided D1 database that
 * backs the test middleware. Mirrors the migrations under
 * packages/db/migrations/0000 and 0002 with two test-only relaxations:
 *   1. `rag_chunks.embedding` is a plain BLOB (the libsql vector functions
 *      are not available in D1 \u2014 the rag repo's local fallback path handles
 *      raw Float32 BLOBs already).
 *   2. The libsql_vector_idx index is omitted for the same reason.
 *
 * D1 also disables foreign-key enforcement by default, so we drop the FK
 * clauses to keep the CREATE statements in vanilla SQLite syntax.
 */
export async function ensureTestSchema(): Promise<void> {
  if (!env.BILLI_DB) {
    throw new Error('BILLI_DB binding missing \u2014 check vitest.config.ts d1Databases');
  }
  const db = drizzle(env.BILLI_DB);
  await db.run(sql`CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY NOT NULL,
    email text DEFAULT '' NOT NULL,
    rfc text,
    default_currency text DEFAULT 'MXN' NOT NULL,
    created_at integer DEFAULT (unixepoch()) NOT NULL,
    consent_v integer,
    consent_at integer
  )`);
  await db.run(sql`CREATE TABLE IF NOT EXISTS transactions (
    id text PRIMARY KEY NOT NULL,
    owner_id text NOT NULL,
    type text NOT NULL,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'MXN' NOT NULL,
    category text NOT NULL,
    occurred_at integer NOT NULL,
    source text NOT NULL,
    source_ref text,
    note text,
    created_at integer DEFAULT (unixepoch()) NOT NULL,
    updated_at integer,
    CONSTRAINT transactions_type_chk CHECK(type IN ('income','expense')),
    CONSTRAINT transactions_amount_chk CHECK(amount_cents > 0),
    CONSTRAINT transactions_cat_len_chk CHECK(length(category) BETWEEN 1 AND 32),
    CONSTRAINT transactions_source_chk CHECK(source IN ('form','text','voice','image','chat')),
    CONSTRAINT transactions_note_len_chk CHECK(note IS NULL OR length(note) <= 280)
  )`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS tx_owner_time_idx ON transactions (owner_id, occurred_at)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS tx_owner_cat_idx ON transactions (owner_id, category)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS tx_owner_type_idx ON transactions (owner_id, type)`);
  await db.run(sql`CREATE TABLE IF NOT EXISTS categories (
    id text PRIMARY KEY NOT NULL,
    owner_id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    icon text,
    created_at integer DEFAULT 0 NOT NULL
  )`);
  await db.run(sql`CREATE TABLE IF NOT EXISTS documents (
    id text PRIMARY KEY NOT NULL,
    owner_id text NOT NULL,
    transaction_id text NOT NULL,
    storage_key text NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    created_at integer NOT NULL
  )`);
  await db.run(sql`CREATE TABLE IF NOT EXISTS rag_chunks (
    id text PRIMARY KEY NOT NULL,
    topic text NOT NULL,
    content text NOT NULL,
    metadata text,
    embedding BLOB
  )`);
}

/** Truncate every domain table. Schema stays intact so tests run quickly. */
export async function resetTestData(): Promise<void> {
  if (!env.BILLI_DB) return;
  const db = drizzle(env.BILLI_DB);
  await db.run(sql`DELETE FROM rag_chunks`);
  await db.run(sql`DELETE FROM documents`);
  await db.run(sql`DELETE FROM transactions`);
  await db.run(sql`DELETE FROM categories`);
  await db.run(sql`DELETE FROM users`);
}