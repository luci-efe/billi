import { describe, it, expect, vi } from 'vitest';
import { embedText, chatJSON } from '../openrouter';

function makeEmbedding(): number[] {
  return Array.from({ length: 1536 }, (_, i) => (i % 7) * 0.001);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('embedText', () => {
  it('sends correct shape and parses 1536-dim embedding', async () => {
    const embedding = makeEmbedding();
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init!.body as string);
      expect(_url).toBe('https://openrouter.ai/api/v1/embeddings');
      expect(body.model).toBe('openai/text-embedding-3-small');
      expect(body.input).toBe('hola mundo');
      const headers = new Headers(init!.headers);
      expect(headers.get('Authorization')).toBe('Bearer sk-test');
      return jsonResponse({ data: [{ embedding }] });
    });
    const result = await embedText('hola mundo', {
      apiKey: 'sk-test',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(result).toEqual(embedding);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds', async () => {
    const embedding = makeEmbedding();
    let calls = 0;
    const fetcher = vi.fn(async () => {
      calls++;
      if (calls < 2) return new Response('rate limited', { status: 429 });
      return jsonResponse({ data: [{ embedding }] });
    });
    const result = await embedText('hi', {
      apiKey: 'k',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(result.length).toBe(1536);
    expect(calls).toBe(2);
  });
});

describe('chatJSON', () => {
  it('sends json_schema response_format and parses content', async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init!.body as string);
      expect(_url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(body.model).toBe('openai/gpt-4o-mini');
      expect(body.response_format.type).toBe('json_schema');
      expect(body.response_format.json_schema.strict).toBe(true);
      expect(body.response_format.json_schema.name).toBe('decision');
      expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' });
      expect(body.messages[1]).toEqual({ role: 'user', content: 'usr' });
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      });
    });
    const result = await chatJSON<{ ok: boolean }>({
      apiKey: 'k',
      model: 'openai/gpt-4o-mini',
      system: 'sys',
      user: 'usr',
      schema: {
        name: 'decision',
        schema: {
          type: 'object',
          properties: { ok: { type: 'boolean' } },
          required: ['ok'],
        },
      },
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
  });
});
