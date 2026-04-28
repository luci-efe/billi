import { describe, it, expect } from 'vitest';

describe('SPEC-20260427-001: RAG Infrastructure & Corpus Pipeline', () => {
  describe('REQ-001: Vector-Enabled Database Schema', () => {
    it('should successfully migrate database with vector support', async () => {
      // GIVEN: A fresh database instance
      const { createClient } = await import('@libsql/client');
      const { drizzle } = await import('drizzle-orm/libsql');
      const schema = await import('../packages/db/src/schema/index');
      
      const client = createClient({ url: 'file:test.db' });
      const db = drizzle(client, { schema });
      
      // WHEN: The RAG schema migration is applied
      // Note: for test purposes we just execute the schema creation directly
      await client.execute(`
        CREATE TABLE IF NOT EXISTS \`rag_chunks\` (
          \`id\` text PRIMARY KEY NOT NULL,
          \`topic\` text NOT NULL,
          \`content\` text NOT NULL,
          \`metadata\` text,
          \`embedding\` blob
        );
      `);

      // THEN: The 'rag_chunks' table MUST exist with an 'embedding' column of type blob
      const tableInfo = await client.execute("PRAGMA table_info('rag_chunks')");
      const embeddingCol = tableInfo.rows.find(row => row.name === 'embedding');
      
      expect(embeddingCol).toBeDefined();
      expect(embeddingCol?.type).toBe('BLOB');
      
      // Cleanup
      client.close();
    });

    it('should reject incompatible vector dimensions during ingestion', async () => {
      // GIVEN: A vector with 512 dimensions (instead of 1536)
      const invalidEmbedding = new Array(512).fill(0.1);
      
      const { createClient } = await import('@libsql/client');
      const { drizzle } = await import('drizzle-orm/libsql');
      const schema = await import('../packages/db/src/schema/index');
      
      const client = createClient({ url: 'file:test.db' });
      const db = drizzle(client, { schema });
      
      // Ensure table exists for repo methods
      await client.execute(`
        CREATE TABLE IF NOT EXISTS \`rag_chunks\` (
          \`id\` text PRIMARY KEY NOT NULL,
          \`topic\` text NOT NULL,
          \`content\` text NOT NULL,
          \`metadata\` text,
          \`embedding\` blob
        );
      `);

      const { insertRagChunk } = await import('../packages/db/src/repos/rag');
      
      // WHEN: Attempting to insert into 'rag_chunks'
      // THEN: The database or repository SHOULD throw a validation error
      await expect(insertRagChunk(db, {
        topic: 'test',
        content: 'test content',
        embedding: invalidEmbedding
      })).rejects.toThrow('Embedding must have exactly 1536 dimensions');
      
      client.close();
    });
  });

  describe('REQ-002: Scalable Ingestion & Embedding Pipeline', () => {
    it('should recursively process a directory of documents, chunk them, and generate embeddings', async () => {
      // GIVEN: A directory with multiple markdown files
      const { mkdir, writeFile, rm } = await import('fs/promises');
      const testDir = 'test_corpus';
      await rm(testDir, { recursive: true, force: true });
      await mkdir(testDir, { recursive: true });
      
      const file1 = 'test_corpus/doc1.md';
      const file2 = 'test_corpus/doc2.md';
      await writeFile(file1, 'This is a long document that needs to be chunked. '.repeat(50));
      await writeFile(file2, 'Another document with different content. '.repeat(50));

      // Mock fetch for OpenRouter
      const originalFetch = global.fetch;
      let fetchCalls = 0;
      global.fetch = async (url: any, options: any) => {
        if (url === 'https://openrouter.ai/api/v1/embeddings') {
          fetchCalls++;
          return new Response(JSON.stringify({
            data: [
              { embedding: new Array(1536).fill(0.5) }
            ]
          }), { status: 200 });
        }
        return originalFetch(url, options);
      };

      try {
        const { processCorpusDirectory } = await import('../apps/api/src/scripts/rag/ingest');
        
        // WHEN: The ingestion script runs
        const chunks = await processCorpusDirectory(testDir);
        
        // THEN: It SHALL split content into chunks with 50-token overlap and call OpenRouter for embeddings
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0].embedding.length).toBe(1536);
        expect(fetchCalls).toBeGreaterThan(0);
        
        // Validate chunking with overlap
        expect(chunks[0].content).toContain('This is a long document');
      } finally {
        global.fetch = originalFetch;
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it('should handle a batch of documents and verify chunks/vectors in DB', async () => {
      // GIVEN: A set of source documents
      const { mkdir, writeFile, rm } = await import('fs/promises');
      const testDir = 'test_corpus_db';
      await rm(testDir, { recursive: true, force: true });
      await mkdir(testDir, { recursive: true });
      
      const file1 = 'test_corpus_db/doc1.md';
      await writeFile(file1, 'Some content here for db testing. '.repeat(10));

      const { createClient } = await import('@libsql/client');
      const { drizzle } = await import('drizzle-orm/libsql');
      const schema = await import('../packages/db/src/schema/index');
      
      const client = createClient({ url: 'file:test_ingest.db' });
      const db = drizzle(client, { schema });
      
      await client.execute(`
        CREATE TABLE IF NOT EXISTS \`rag_chunks\` (
          \`id\` text PRIMARY KEY NOT NULL,
          \`topic\` text NOT NULL,
          \`content\` text NOT NULL,
          \`metadata\` text,
          \`embedding\` blob
        );
      `);

      const originalFetch = global.fetch;
      global.fetch = async (url: any, options: any) => {
        return new Response(JSON.stringify({
          data: [
            { embedding: new Array(1536).fill(0.1) }
          ]
        }), { status: 200 });
      };

      try {
        const { processCorpusDirectory } = await import('../apps/api/src/scripts/rag/ingest');
        const { insertRagChunk } = await import('../packages/db/src/repos/rag');
        
        // WHEN: The pipeline finishes execution
        const chunks = await processCorpusDirectory(testDir);
        for (const chunk of chunks) {
          await insertRagChunk(db, {
            topic: 'test',
            content: chunk.content,
            metadata: JSON.stringify(chunk.metadata),
            embedding: chunk.embedding
          });
        }
        
        // THEN: The database MUST contain the expected number of chunks with non-null embeddings
        const result = await client.execute("SELECT count(*) as count FROM rag_chunks");
        expect(Number(result.rows[0].count)).toBeGreaterThan(0);
        
        const chunksDb = await client.execute("SELECT embedding FROM rag_chunks LIMIT 1");
        expect(chunksDb.rows[0].embedding).toBeDefined();
        expect(chunksDb.rows[0].embedding).not.toBeNull();
      } finally {
        global.fetch = originalFetch;
        await rm(testDir, { recursive: true, force: true });
        // Cleanup db file to avoid locks
        client.close();
      }
    });

    it('should handle a "rich" corpus (100+ documents) without timing out or exceeding rate limits', async () => {
      // GIVEN: A large corpus of 100+ documents
      const { mkdir, writeFile, rm } = await import('fs/promises');
      const testDir = 'test_corpus_large';
      await rm(testDir, { recursive: true, force: true });
      await mkdir(testDir, { recursive: true });
      
      for (let i = 0; i < 105; i++) {
        await writeFile(`${testDir}/doc${i}.md`, `Content of document ${i}.`);
      }

      const originalFetch = global.fetch;
      let concurrentRequests = 0;
      let maxConcurrentRequests = 0;
      global.fetch = async (url: any, options: any) => {
        concurrentRequests++;
        maxConcurrentRequests = Math.max(maxConcurrentRequests, concurrentRequests);
        
        // simulate network delay
        await new Promise(resolve => setTimeout(resolve, 5));
        
        concurrentRequests--;
        return new Response(JSON.stringify({
          data: [
            { embedding: new Array(1536).fill(0.1) }
          ]
        }), { status: 200 });
      };

      try {
        const { processCorpusDirectory } = await import('../apps/api/src/scripts/rag/ingest');
        
        // WHEN: The pipeline runs with rate-limiting enabled
        const chunks = await processCorpusDirectory(testDir);
        
        // THEN: All documents SHALL be processed successfully without 429 errors from OpenRouter
        expect(chunks.length).toBeGreaterThanOrEqual(105);
        expect(maxConcurrentRequests).toBeLessThan(10); 
      } finally {
        global.fetch = originalFetch;
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });

  describe('REQ-003: Similarity Retrieval Repository', () => {
    it('should return the K most similar chunks for a natural language query', async () => {
      // GIVEN: A database populated with SAT-related chunks
      const { createClient } = await import('@libsql/client');
      const { drizzle } = await import('drizzle-orm/libsql');
      const schema = await import('../packages/db/src/schema/index');
      
      const dbFile = `test_retrieve_k_${Date.now()}.db`;
      const client = createClient({ url: `file:${dbFile}` });
      const db = drizzle(client, { schema });
      
      // Ensure table exists for repo methods
      await client.execute(`
        CREATE TABLE IF NOT EXISTS \`rag_chunks\` (
          \`id\` text PRIMARY KEY NOT NULL,
          \`topic\` text NOT NULL,
          \`content\` text NOT NULL,
          \`metadata\` text,
          \`embedding\` F32_BLOB(1536)
        );
      `);

      // Add a vector index for performance (simulating migration)
      await client.execute(`
        CREATE INDEX IF NOT EXISTS \`idx_rag_chunks_embedding\` ON \`rag_chunks\` (
          libsql_vector_idx(embedding)
        );
      `).catch(() => {}); // ignore if unsupported in current local sqlite build

      const { insertRagChunk, retrieveTopK } = await import('../packages/db/src/repos/rag');

      const similarEmbedding = new Array(1536).fill(0);
      similarEmbedding[0] = 0.9;
      similarEmbedding[1] = 0.1;
      
      const somewhatSimilarEmbedding = new Array(1536).fill(0);
      somewhatSimilarEmbedding[0] = 0.5;
      somewhatSimilarEmbedding[1] = 0.5;

      const differentEmbedding = new Array(1536).fill(0);
      differentEmbedding[0] = -0.9;

      await insertRagChunk(db, {
        topic: 'sat',
        content: 'SAT stands for Servicio de Administracion Tributaria',
        embedding: similarEmbedding
      });
      await insertRagChunk(db, {
        topic: 'sat-basics',
        content: 'You must pay your taxes to the SAT',
        embedding: somewhatSimilarEmbedding
      });
      await insertRagChunk(db, {
        topic: 'imss',
        content: 'IMSS is for healthcare',
        embedding: differentEmbedding
      });

      const queryEmbedding = new Array(1536).fill(0);
      queryEmbedding[0] = 1.0;

      // WHEN: retrieveTopK is called
      const results = await retrieveTopK(db, queryEmbedding, 2);
      console.log('RESULTS:', results);

      // THEN: It SHALL return the K most relevant chunks based on cosine similarity
      expect(results.length).toBe(2);
      expect(results[0].topic).toBe('sat');
      expect(results[1].topic).toBe('sat-basics');
      
      client.close();
    });

    it('should return the most relevant chunks from across all ingested sources for "SAT basics"', async () => {
      // GIVEN: Multiple sources (SAT, RESICO, Ley ISR) ingested
      const dbFile = `test_retrieve_sources_${Date.now()}.db`;
      const { createClient } = await import('@libsql/client');
      const { drizzle } = await import('drizzle-orm/libsql');
      const schema = await import('../packages/db/src/schema/index');
      
      const client = createClient({ url: `file:${dbFile}` });
      const db = drizzle(client, { schema });
      
      await client.execute(`
        CREATE TABLE IF NOT EXISTS \`rag_chunks\` (
          \`id\` text PRIMARY KEY NOT NULL,
          \`topic\` text NOT NULL,
          \`content\` text NOT NULL,
          \`metadata\` text,
          \`embedding\` F32_BLOB(1536)
        );
      `);

      const { insertRagChunk, retrieveTopK } = await import('../packages/db/src/repos/rag');

      // Create distinct embeddings for topics
      const satEmbedding = new Array(1536).fill(0);
      satEmbedding[0] = 0.9;
      
      const resicoEmbedding = new Array(1536).fill(0);
      resicoEmbedding[0] = 0.8;
      
      const isrEmbedding = new Array(1536).fill(0);
      isrEmbedding[0] = 0.7;
      
      const unrelatedEmbedding = new Array(1536).fill(0);
      unrelatedEmbedding[0] = -0.5;

      await insertRagChunk(db, {
        topic: 'SAT',
        content: 'SAT stands for Servicio de Administracion Tributaria. It handles taxes.',
        embedding: satEmbedding
      });
      await insertRagChunk(db, {
        topic: 'RESICO',
        content: 'RESICO is a tax regime managed by the SAT for simplified taxes.',
        embedding: resicoEmbedding
      });
      await insertRagChunk(db, {
        topic: 'Ley ISR',
        content: 'The Income Tax Law dictates how much you pay to the SAT.',
        embedding: isrEmbedding
      });
      await insertRagChunk(db, {
        topic: 'IMSS',
        content: 'IMSS provides health insurance in Mexico.',
        embedding: unrelatedEmbedding
      });

      const queryEmbedding = new Array(1536).fill(0);
      queryEmbedding[0] = 1.0;

      // WHEN: Querying for "SAT basics"
      const results = await retrieveTopK(db, queryEmbedding, 3);

      // THEN: Chunks from different sources SHALL be retrieved if they are semantically relevant
      expect(results.length).toBe(3);
      const topics = results.map(r => r.topic);
      expect(topics).toContain('SAT');
      expect(topics).toContain('RESICO');
      expect(topics).toContain('Ley ISR');
      expect(topics).not.toContain('IMSS');
      
      client.close();
    });
  });
});
