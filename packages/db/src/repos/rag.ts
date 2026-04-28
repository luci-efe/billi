import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import { ragChunks } from '../schema';

export type InsertRagChunkParams = {
  topic: string;
  content: string;
  metadata?: any;
  embedding?: number[];
};

export async function insertRagChunk(db: LibSQLDatabase<any>, params: InsertRagChunkParams) {
  if (params.embedding && params.embedding.length !== 1536) {
    throw new Error('Embedding must have exactly 1536 dimensions');
  }

  const embeddingBlob = params.embedding 
    ? Buffer.from(new Float32Array(params.embedding).buffer) 
    : undefined;

  return await db.insert(ragChunks).values({
    topic: params.topic,
    content: params.content,
    metadata: params.metadata,
    embedding: embeddingBlob as any,
  }).returning();
}

export async function retrieveTopK(db: LibSQLDatabase<any>, queryEmbedding: number[], k: number = 5) {
  if (queryEmbedding.length !== 1536) {
    throw new Error('Query embedding must have exactly 1536 dimensions');
  }

  // Use LibSQL vector functions. We cast the float32 array query embedding to blob.
  const queryBlob = Buffer.from(new Float32Array(queryEmbedding).buffer);

  // We are using raw SQL for the similarity query because Drizzle might not have native vector distance support yet for LibSQL.
  // The `vector_distance_cos` returns distance (smaller is closer), or we can use `vector_top_k`.
  // The correct syntax for LibSQL:
  // SELECT * FROM rag_chunks WHERE vector_distance_cos(embedding, ?) IS NOT NULL ORDER BY vector_distance_cos(embedding, ?) LIMIT ?

  // Workaround: We can't easily pass a raw blob safely to raw SQL via some older Drizzle methods,
  // but `sql` handles parameters correctly.
  
  const results = await db.all(sql`
    SELECT id, topic, content, metadata
    FROM ${ragChunks}
    ORDER BY vector_distance_cos(embedding, ${queryBlob})
    LIMIT ${k}
  `);

  return results as {
    id: string;
    topic: string;
    content: string;
    metadata: any;
  }[];
}
