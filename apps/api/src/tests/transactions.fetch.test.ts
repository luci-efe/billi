/// <reference types="@cloudflare/vitest-pool-workers" />
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { ensureTestSchema, resetTestData } from './setup';

type CreateTransactionResponse = { id: string };
type TransactionJson = { source: string; amountCents: number; category: string; note?: string | null };
type ErrorResponse = { error: string };

describe('POST /api/transactions', () => {
  beforeAll(ensureTestSchema);
  beforeEach(resetTestData);

  it('creates a transaction with default source "form"', async () => {
    const payload = {
      type: 'expense',
      amountCents: 15000,
      category: 'Food',
      occurredAt: Math.floor(Date.now() / 1000),
      note: 'Lunch at work'
    };

    const res = await SELF.fetch('http://example.com/api/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as CreateTransactionResponse;
    expect(body.id).toBeDefined();

    // Verify persistence and default source
    const getRes = await SELF.fetch(`http://example.com/api/transactions/${body.id}`, {
      headers: { Authorization: 'Bearer user_123' },
    });
    const tx = (await getRes.json()) as TransactionJson;
    expect(tx.source).toBe('form');
    expect(tx.amountCents).toBe(15000);
  });

  it('creates a transaction with explicit source "chat"', async () => {
    const payload = {
      type: 'expense',
      amountCents: 5000,
      category: 'Transport',
      occurredAt: Math.floor(Date.now() / 1000),
      source: 'chat'
    };

    const res = await SELF.fetch('http://example.com/api/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as CreateTransactionResponse;

    const getRes = await SELF.fetch(`http://example.com/api/transactions/${body.id}`, {
      headers: { Authorization: 'Bearer user_123' },
    });
    const tx = (await getRes.json()) as TransactionJson;
    expect(tx.source).toBe('chat');
  });

  it('accepts every supported transaction source and rejects unsupported values', async () => {
    const validSources = ['form', 'text', 'voice', 'image', 'chat'] as const;

    for (const source of validSources) {
      const res = await SELF.fetch('http://example.com/api/transactions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_sources',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'expense',
          amountCents: 100,
          category: 'Test',
          occurredAt: 1234567890,
          source,
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as CreateTransactionResponse;
      const getRes = await SELF.fetch(`http://example.com/api/transactions/${body.id}`, {
        headers: { Authorization: 'Bearer user_sources' },
      });
      const tx = (await getRes.json()) as TransactionJson;
      expect(tx.source).toBe(source);
    }

    const res = await SELF.fetch('http://example.com/api/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_sources',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'expense',
        amountCents: 100,
        category: 'Test',
        occurredAt: 1234567890,
        source: 'recurring',
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe('validation_failed');
  });

  it('returns 500 instead of synthetic success when transaction persistence fails', async () => {
    await env.BILLI_DB?.prepare('DROP TABLE transactions').run();

    try {
      const res = await SELF.fetch('http://example.com/api/transactions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_123',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'expense',
          amountCents: 7000,
          category: 'Food',
          occurredAt: Math.floor(Date.now() / 1000),
        }),
      });

      expect(res.status).toBe(500);
    } finally {
      await ensureTestSchema();
      await resetTestData();
    }
  });

  it('rejects invalid transaction type', async () => {
    const payload = {
      type: 'invalid_type',
      amountCents: 100,
      category: 'Test',
      occurredAt: 1234567890
    };

    const res = await SELF.fetch('http://example.com/api/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe('validation_failed');
  });

  it('enforces ownership: cannot GET another user\'s transaction', async () => {
    // 1. User A creates a transaction
    const createRes = await SELF.fetch('http://example.com/api/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_A',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'income',
        amountCents: 1000,
        category: 'Salary',
        occurredAt: 1234567890
      }),
    });
    const { id } = (await createRes.json()) as CreateTransactionResponse;

    // 2. User B tries to GET it
    const getRes = await SELF.fetch(`http://example.com/api/transactions/${id}`, {
      headers: { Authorization: 'Bearer user_B' },
    });

    expect(getRes.status).toBe(404);
  });
});

describe('PATCH /api/transactions/:id', () => {
  beforeAll(ensureTestSchema);
  beforeEach(resetTestData);

  it('updates an existing transaction', async () => {
    const createRes = await SELF.fetch('http://example.com/api/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'expense',
        amountCents: 1000,
        category: 'Food',
        occurredAt: 1234567890
      }),
    });
    const { id } = (await createRes.json()) as CreateTransactionResponse;

    const patchRes = await SELF.fetch(`http://example.com/api/transactions/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ amountCents: 2000 }),
    });

    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as TransactionJson;
    expect(updated.amountCents).toBe(2000);
  });

  it('clears note values and rejects unsupported patch fields', async () => {
    const createRes = await SELF.fetch('http://example.com/api/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'expense',
        amountCents: 1000,
        category: 'Food',
        occurredAt: 1234567890,
        note: 'Original note',
      }),
    });
    const { id } = (await createRes.json()) as CreateTransactionResponse;

    const clearRes = await SELF.fetch(`http://example.com/api/transactions/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ note: null }),
    });

    expect(clearRes.status).toBe(200);
    const cleared = (await clearRes.json()) as TransactionJson;
    expect(cleared.note).toBeNull();

    const invalidFieldRes = await SELF.fetch(`http://example.com/api/transactions/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ source: 'chat' }),
    });

    expect(invalidFieldRes.status).toBe(400);
    const error = (await invalidFieldRes.json()) as ErrorResponse;
    expect(error.error).toBe('validation_failed');
  });
});
