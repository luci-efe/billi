/// <reference types="@cloudflare/vitest-pool-workers" />
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { SELF } from 'cloudflare:test';
import {
  activateFetchMock,
  deactivateFetchMock,
  ensureTestSchema,
  mockChatJSON,
  resetTestData,
} from './setup';

// HTTP integration tests for `POST /api/capture`. Run inside the Workers pool.
//
// The capture workflow calls the OpenRouter chat-completions endpoint exactly
// once and parses `choices[0].message.content` as JSON. We use the `mockChatJSON`
// helper from setup.ts which mirrors that contract.

describe('POST /api/capture', () => {
  beforeAll(ensureTestSchema);
  beforeEach(async () => {
    await resetTestData();
    activateFetchMock();
  });
  afterEach(() => deactivateFetchMock());

  it('returns 401 when Authorization header is missing', async () => {
    const res = await SELF.fetch('http://example.com/api/capture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Gasté 150 en gasolina' }),
    });
    expect(res.status).toBe(401);
  });

  it('extracts amount + category from a clear NL message', async () => {
    mockChatJSON({
      amountCents: 15000,
      category: 'Transporte',
      type: 'expense',
      date: '2026-04-28',
      confidence: 0.95,
    });

    const res = await SELF.fetch('http://example.com/api/capture', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message: 'Gasté 150 en gasolina' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      proposal?: { amountCents: number; category: string };
      confidence: number;
    };
    expect(body.proposal?.amountCents).toBe(15000);
    expect(body.proposal?.category).toBe('Transporte');
  });

  it('returns confidence=0 + Spanish error when the model cannot parse', async () => {
    mockChatJSON({
      confidence: 0,
      error:
        'No pude entender los detalles de la transacción. ¿Podrías ser más específico?',
    });

    const res = await SELF.fetch('http://example.com/api/capture', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message: 'asdfasdf qwerty zxcvbn' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { confidence: number; error?: string };
    expect(body.confidence).toBe(0);
    expect(body.error && body.error.length > 0).toBe(true);
  });

  it('extracts merchant from an image URL via the vision model', async () => {
    mockChatJSON({
      amountCents: 28999,
      category: 'Comida',
      type: 'expense',
      date: '2026-04-28',
      merchant: 'Walmart',
      confidence: 0.9,
    });

    const res = await SELF.fetch('http://example.com/api/capture', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ imageUrl: 'https://example.com/walmart.jpg' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      proposal?: { merchant?: string };
    };
    expect(body.proposal?.merchant).toBe('Walmart');
  });
});
