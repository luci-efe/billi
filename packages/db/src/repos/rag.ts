import type { DbClient } from '../client';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { ragChunks } from '../schema';

export type InsertRagChunkParams = {
  topic: string;
  content: string;
  metadata?: unknown;
  embedding?: number[];
};

// Driver-capability cache. Probed once per process via `hasVector32`; used by
// both insert and retrieve to pick the right code path. Turso/libsql remote
// → true. Local sqlite (bun's bundled or `file::memory:`) → false.
let _hasVector32: boolean | null = null;

async function hasVector32(db: DbClient): Promise<boolean> {
  if (_hasVector32 !== null) return _hasVector32;
  try {
    await db.run(sql`SELECT vector32('[0]')`);
    _hasVector32 = true;
  } catch {
    _hasVector32 = false;
  }
  return _hasVector32;
}

// Exported for tests that want to force-reset the probe between suites.
export function _resetVector32Cache(): void {
  _hasVector32 = null;
}

export async function insertRagChunk(
  db: DbClient,
  params: InsertRagChunkParams,
) {
  if (params.embedding && params.embedding.length !== 1536) {
    throw new Error('Embedding must have exactly 1536 dimensions');
  }

  const useVector32 = await hasVector32(db);

  if (useVector32) {
    // Turso path: pass `number[]` so the customType `toDriver` emits
    // `vector32('[...]')` server-side.
    return await db
      .insert(ragChunks)
      .values({
        topic: params.topic,
        content: params.content,
        metadata: params.metadata,
        embedding: params.embedding,
      })
      .returning();
  }

  // Local-sqlite fallback (tests/dev only): bypass the customType and write
  // the raw little-endian Float32 BLOB. Schema reads still go through
  // `f32Blob.fromDriver`, which decodes the bytes regardless of who wrote
  // them.
  const id = createId();
  const metadataJson =
    params.metadata === undefined || params.metadata === null
      ? null
      : JSON.stringify(params.metadata);
  const embeddingBuf = params.embedding
    ? Buffer.from(new Float32Array(params.embedding).buffer)
    : null;

  await db.run(sql`
    INSERT INTO rag_chunks (id, topic, content, metadata, embedding)
    VALUES (${id}, ${params.topic}, ${params.content}, ${metadataJson}, ${embeddingBuf})
  `);

  return [
    {
      id,
      topic: params.topic,
      content: params.content,
      metadata: params.metadata ?? null,
      embedding: params.embedding ?? null,
    },
  ];
}

export type RetrievedChunk = {
  id: string;
  topic: string;
  content: string;
  metadata: unknown;
  /**
   * Cosine similarity to the query embedding, in [-1, 1]. 1 = identical,
   * 0 = orthogonal, -1 = opposite. Callers can threshold this (e.g.
   * `>= 0.7`) to drop low-relevance hits before synthesis.
   */
  score: number;
};

export async function retrieveTopK(
  db: DbClient,
  queryEmbedding: number[],
  k: number = 5,
): Promise<RetrievedChunk[]> {
  if (queryEmbedding.length !== 1536) {
    throw new Error('Query embedding must have exactly 1536 dimensions');
  }

  const queryJson = JSON.stringify(queryEmbedding);

  try {
    // Turso path: server-side cosine distance against the F32_BLOB column.
    // Wrapping the JSON in `vector32(?)` lets us bind a single text param
    // while letting the engine handle the cast.
    const results = (await db.all(sql`
      SELECT id, topic, content, metadata,
             1.0 - vector_distance_cos(embedding, vector32(${queryJson})) AS score
      FROM ${ragChunks}
      ORDER BY vector_distance_cos(embedding, vector32(${queryJson}))
      LIMIT ${k}
    `)) as Array<RetrievedChunk & { score: unknown }>;
    // libsql returns numeric expressions as `number`; coerce defensively.
    return results.map((r) => ({
      id: r.id,
      topic: r.topic,
      content: r.content,
      metadata: r.metadata,
      score: typeof r.score === 'number' ? r.score : Number(r.score),
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      !/no such function:\s*vector_distance_cos/i.test(msg) &&
      !/no such function:\s*vector32/i.test(msg) &&
      !/vector:\s*must start with/i.test(msg)
    ) {
      throw err;
    }

    // Local-sqlite fallback (tests/dev only): brute-force cosine in JS.
    const rows = (await db.all(sql`
      SELECT id, topic, content, metadata, embedding FROM ${ragChunks}
    `)) as Array<{
      id: string;
      topic: string;
      content: string;
      metadata: unknown;
      embedding: Buffer | Uint8Array | null;
    }>;

    const queryNorm = vectorNorm(queryEmbedding);
    const scored = rows.map((row) => {
      if (!row.embedding) return { row, score: -Infinity };
      const arr = bufferToFloatArray(row.embedding);
      return { row, score: cosineSimilarity(queryEmbedding, arr, queryNorm) };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map(({ row, score }) => ({
      id: row.id,
      topic: row.topic,
      content: row.content,
      metadata: row.metadata,
      score,
    }));
  }
}

function bufferToFloatArray(buf: Buffer | Uint8Array): number[] {
  // Float32Array needs aligned bytes; slice to a fresh ArrayBuffer to be safe.
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return Array.from(new Float32Array(ab));
}

function vectorNorm(v: number[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    const x = v[i]!;
    s += x * x;
  }
  return Math.sqrt(s);
}

function cosineSimilarity(a: number[], b: number[], aNorm?: number): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let bSq = 0;
  for (let i = 0; i < len; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dot += ai * bi;
    bSq += bi * bi;
  }
  const denom = (aNorm ?? vectorNorm(a)) * Math.sqrt(bSq);
  return denom === 0 ? 0 : dot / denom;
}
