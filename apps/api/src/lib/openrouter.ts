import { z } from 'zod';

/**
 * Tiny OpenRouter HTTP helpers tailored for Cloudflare Workers (no Node-only
 * APIs). Each helper accepts an optional `fetcher` for tests.
 *
 * These wrap the OpenAI-compatible REST surface exposed at
 * https://openrouter.ai/api/v1.
 */

export type FetchLike = typeof fetch;

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_EMBED_MODEL = 'openai/text-embedding-3-small';
const EMBED_DIMS = 1536;

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

async function withRetry<T>(fn: (attempt: number) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number } | undefined)?.status;
      const retryable = status === undefined || RETRYABLE_STATUS.has(status);
      if (!retryable || attempt === MAX_ATTEMPTS) {
        throw err;
      }
      const backoffMs = 250 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

class OpenRouterHTTPError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message?: string) {
    super(message ?? `OpenRouter HTTP ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

const embeddingsResponseSchema = z.object({
  data: z
    .array(
      z.object({
        embedding: z.array(z.number()),
      }),
    )
    .min(1),
});

export interface EmbedTextOpts {
  apiKey: string;
  model?: string;
  fetcher?: FetchLike;
}

export async function embedText(
  text: string,
  opts: EmbedTextOpts,
): Promise<number[]> {
  const fetcher = opts.fetcher ?? fetch;
  const model = opts.model ?? DEFAULT_EMBED_MODEL;

  return withRetry(async () => {
    const res = await fetcher(`${OPENROUTER_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: text }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new OpenRouterHTTPError(res.status, body);
    }

    const json = await res.json();
    const parsed = embeddingsResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(
        `OpenRouter embeddings: unexpected response shape: ${JSON.stringify(json).slice(0, 300)}`,
      );
    }
    const embedding = parsed.data.data[0]!.embedding;
    if (embedding.length !== EMBED_DIMS) {
      throw new Error(
        `OpenRouter embeddings: expected ${EMBED_DIMS} dims, got ${embedding.length}`,
      );
    }
    return embedding;
  });
}

export interface JSONSchemaSpec {
  name: string;
  schema: object;
}

interface ChatRequestBody {
  model: string;
  messages: Array<{
    role: 'system' | 'user';
    content:
      | string
      | Array<
          | { type: 'text'; text: string }
          | { type: 'image_url'; image_url: { url: string } }
        >;
  }>;
  response_format: {
    type: 'json_schema';
    json_schema: { name: string; strict: true; schema: object };
  };
}

const chatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

async function postChatJSON(
  fetcher: FetchLike,
  apiKey: string,
  body: ChatRequestBody,
): Promise<string> {
  return withRetry(async () => {
    const res = await fetcher(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new OpenRouterHTTPError(res.status, body);
    }
    const json = await res.json();
    const parsed = chatResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(
        `OpenRouter chat: unexpected response shape: ${JSON.stringify(json).slice(0, 300)}`,
      );
    }
    return parsed.data.choices[0]!.message.content;
  });
}

export interface ChatJSONArgs {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  schema: JSONSchemaSpec;
  fetcher?: FetchLike;
}

export async function chatJSON<T>(args: ChatJSONArgs): Promise<T> {
  const fetcher = args.fetcher ?? fetch;
  const body: ChatRequestBody = {
    model: args.model,
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: args.schema.name, strict: true, schema: args.schema.schema },
    },
  };
  const content = await postChatJSON(fetcher, args.apiKey, body);
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(
      `OpenRouter chat: model returned non-JSON content: ${content.slice(0, 300)}`,
    );
  }
}

export interface ChatVisionJSONArgs {
  apiKey: string;
  model: string;
  system: string;
  imageUrl: string;
  schema: JSONSchemaSpec;
  fetcher?: FetchLike;
}

export async function chatVisionJSON<T>(args: ChatVisionJSONArgs): Promise<T> {
  const fetcher = args.fetcher ?? fetch;
  const body: ChatRequestBody = {
    model: args.model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: args.system },
          { type: 'image_url', image_url: { url: args.imageUrl } },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: args.schema.name, strict: true, schema: args.schema.schema },
    },
  };
  const content = await postChatJSON(fetcher, args.apiKey, body);
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(
      `OpenRouter chatVision: model returned non-JSON content: ${content.slice(0, 300)}`,
    );
  }
}
