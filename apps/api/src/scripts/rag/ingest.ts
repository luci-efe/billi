import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export interface Chunk {
  content: string;
  metadata: any;
  embedding: number[];
}

export async function processCorpusDirectory(dir: string): Promise<Chunk[]> {
  const files = await getFilesRecursively(dir);
  const allChunks: Chunk[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    // Chunk content
    const chunks = chunkText(content, 1000, 200); // approx 50 tokens overlap
    
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const embedding = await generateEmbedding(chunk);
      allChunks.push({
        content: chunk,
        metadata: { source: file },
        embedding
      });
    }
  }

  return allChunks;
}

async function getFilesRecursively(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const res = join(dir, entry.name);
    return entry.isDirectory() ? await getFilesRecursively(res) : [res];
  }));
  return Array.prototype.concat(...files);
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

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || 'test-key'}`
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: text
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}
