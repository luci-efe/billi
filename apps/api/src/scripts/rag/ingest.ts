import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { createDbClient } from '@billi/db/client';
import { insertRagChunk } from '@billi/db/repos/rag';

export interface Chunk {
  content: string;
  metadata: { source: string };
  embedding: number[];
}

export interface ProcessOptions {
  /** OpenRouter API key. CF Workers callers MUST pass this explicitly — do
   *  not rely on `process.env`, which is empty inside a Workers runtime. */
  apiKey?: string;
  /** OpenAI-compatible embeddings base URL (no trailing slash). */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const DEFAULT_CORPUS_DIR = resolve(process.cwd(), 'content/rag/es');
// Bounded concurrency. The infrastructure test asserts maxConcurrentRequests<10.
const MAX_CONCURRENCY = 5;
const MAX_RETRIES = 3;

const EmbeddingResponse = z.object({
  data: z
    .array(z.object({ embedding: z.array(z.number()).length(1536) }))
    .min(1),
});

export async function processCorpusDirectory(
  dir: string,
  opts: ProcessOptions = {},
): Promise<Chunk[]> {
  const files = await getFilesRecursively(dir);
  return processCorpusFiles(files, opts);
}

export async function processCorpusPath(
  targetPath: string,
  opts: ProcessOptions = {},
): Promise<Chunk[]> {
  const target = resolve(targetPath);
  const targetStat = await stat(target);

  if (targetStat.isDirectory()) {
    return processCorpusDirectory(target, opts);
  }

  if (targetStat.isFile()) {
    return processCorpusFiles([target], opts);
  }

  throw new Error(`Unsupported corpus path: ${target}`);
}

async function processCorpusFiles(
  files: string[],
  opts: ProcessOptions = {},
): Promise<Chunk[]> {
  const apiKey = opts.apiKey ?? process.env.OPENROUTER_API_KEY ?? 'test-key';
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const tasks: Array<{ chunk: string; file: string }> = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const chunks = chunkText(content, 1000, 200); // ~50 token overlap
    for (const c of chunks) {
      if (!c.trim()) continue;
      tasks.push({ chunk: c, file });
    }
  }

  // Worker-pool semaphore: at most MAX_CONCURRENCY embeddings in flight.
  const results: Chunk[] = new Array(tasks.length);
  let nextIndex = 0;
  const workerCount = Math.min(MAX_CONCURRENCY, tasks.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= tasks.length) return;
      const t = tasks[i]!;
      const embedding = await generateEmbedding(t.chunk, { apiKey, baseUrl });
      results[i] = {
        content: t.chunk,
        metadata: { source: t.file },
        embedding,
      };
    }
  });
  await Promise.all(workers);
  return results;
}

async function getFilesRecursively(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const res = join(dir, entry.name);
      return entry.isDirectory() ? await getFilesRecursively(res) : [res];
    }),
  );
  return Array.prototype.concat(...nested);
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

export interface EmbeddingOptions {
  apiKey: string;
  baseUrl?: string;
}

export async function generateEmbedding(
  text: string,
  opts: EmbeddingOptions,
): Promise<number[]> {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${baseUrl}/embeddings`;
  const body = JSON.stringify({ model: EMBEDDING_MODEL, input: text });

  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.apiKey}`,
        },
        body,
      });

      // Retry on transient failures.
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        lastErr = new Error(
          `Embedding request transient failure (HTTP ${response.status} ${response.statusText})`,
        );
        if (attempt < MAX_RETRIES - 1) {
          await sleep(2 ** attempt * 100);
          continue;
        }
        throw lastErr;
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(
          `Failed to generate embedding: ${response.status} ${response.statusText} ${detail}`,
        );
      }

      const raw: unknown = await response.json();
      const parsed = EmbeddingResponse.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `Invalid embedding response: ${JSON.stringify(raw)} :: ${parsed.error.message}`,
        );
      }
      return parsed.data.data[0]!.embedding;
    } catch (err) {
      lastErr = err;
      // Network / fetch errors → retry; schema / client errors → bail.
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /transient failure|fetch failed|ECONNRESET|ETIMEDOUT/i.test(msg);
      if (!transient || attempt >= MAX_RETRIES - 1) {
        throw err;
      }
      await sleep(2 ** attempt * 100);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Embedding request failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ingestCli() {
  const args = process.argv.slice(2);
  const dirArgIndex = args.indexOf('--dir');
  const topicArgIndex = args.indexOf('--topic');
  const dir = dirArgIndex >= 0 ? args[dirArgIndex + 1] : undefined;
  const topic = topicArgIndex >= 0 ? args[topicArgIndex + 1] : undefined;

  if (dirArgIndex >= 0 && !dir) {
    throw new Error('Missing value for --dir');
  }

  if (topicArgIndex >= 0 && !topic) {
    throw new Error('Missing value for --topic');
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const dbToken = process.env.TURSO_AUTH_TOKEN;

  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');
  if (!dbUrl) throw new Error('Missing TURSO_DATABASE_URL');
  if (!dbToken) throw new Error('Missing TURSO_AUTH_TOKEN');

  const baseDir = resolve(dir ?? DEFAULT_CORPUS_DIR);
  const targetPath = topic ? resolve(baseDir, `${topic}.md`) : baseDir;
  const ingestTopic = topic ?? 'general-knowledge';
  const chunks = await processCorpusPath(targetPath, { apiKey });

  if (chunks.length === 0) {
    throw new Error(`No chunks generated from ${targetPath}`);
  }

  const db = createDbClient({ url: dbUrl, authToken: dbToken });
  await db.transaction(async (tx) => {
    await tx.run(sql`DELETE FROM rag_chunks WHERE topic = ${ingestTopic}`);

    const scopedDb = tx as unknown as ReturnType<typeof createDbClient>;
    for (const chunk of chunks) {
      await insertRagChunk(scopedDb, {
        topic: ingestTopic,
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: chunk.embedding,
      });
    }
  });

  console.log(`Ingested ${chunks.length} chunks into rag_chunks for topic '${ingestTopic}'.`);
}

if (import.meta.main) {
  ingestCli().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
