/// <reference types="@cloudflare/vitest-pool-workers" />
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { SELF } from 'cloudflare:test';
import { ensureTestSchema, resetTestData } from './setup';

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
    const body = (await res.json()) as { id: string };
    expect(body.id).toBeDefined();

    // Verify persistence and default source
    const getRes = await SELF.fetch(`http://example.com/api/transactions/${body.id}`, {
      headers: { Authorization: 'Bearer user_123' },
    });
    const tx = await getRes.json();
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
    const body = (await res.json()) as { id: string };

    const getRes = await SELF.fetch(`http://example.com/api/transactions/${body.id}`, {
      headers: { Authorization: 'Bearer user_123' },
    });
    const tx = await getRes.json();
    expect(tx.source).toBe('chat');
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
    const body = await res.json();
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
    const { id } = await createRes.json();

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
    const { id } = await createRes.json();

    const patchRes = await SELF.fetch(`http://example.com/api/transactions/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer user_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ amountCents: 2000 }),
    });

    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.amountCents).toBe(2000);
  });
});
