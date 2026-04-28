import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { createDbClient } from "../../client";
import { insertRagChunk, retrieveTopK, _resetVector32Cache } from "../rag";

// Local in-memory libsql instance has no vector32() / vector_distance_cos
// — exactly the fallback path we want to lock in via this regression test.
const db = createDbClient({ url: "file::memory:" });

function mkVec(seed: number): number[] {
  const v = new Array<number>(1536);
  for (let i = 0; i < 1536; i++) {
    v[i] = Math.sin(seed * 0.7 + i * 0.013);
  }
  return v;
}

function offset(v: number[], delta: number): number[] {
  return v.map((x, i) => (i % 31 === 0 ? x + delta : x));
}

describe("rag repo — local-sqlite fallback", () => {
  beforeEach(async () => {
    _resetVector32Cache();
    await db.run(sql`DROP TABLE IF EXISTS rag_chunks`);
    await db.run(sql`
      CREATE TABLE rag_chunks (
        id text PRIMARY KEY NOT NULL,
        topic text NOT NULL,
        content text NOT NULL,
        metadata text,
        embedding BLOB
      )
    `);
  });

  it("ranks the closest chunk first via in-memory cosine fallback", async () => {
    const target = mkVec(1);
    const v2 = mkVec(2);
    const v3 = mkVec(3);

    await insertRagChunk(db, { topic: "t", content: "near", embedding: target });
    await insertRagChunk(db, { topic: "t", content: "mid", embedding: v2 });
    await insertRagChunk(db, { topic: "t", content: "far", embedding: v3 });

    const query = offset(target, 0.001);
    const results = await retrieveTopK(db, query, 3);

    expect(results).toHaveLength(3);
    expect(results[0]?.content).toBe("near");
  });

  it("rejects wrong-dimension query embeddings", async () => {
    await expect(retrieveTopK(db, [1, 2, 3], 1)).rejects.toThrow(/1536/);
  });

  it("rejects wrong-dimension insert embeddings", async () => {
    await expect(
      insertRagChunk(db, { topic: "t", content: "x", embedding: [1, 2, 3] }),
    ).rejects.toThrow(/1536/);
  });
});
