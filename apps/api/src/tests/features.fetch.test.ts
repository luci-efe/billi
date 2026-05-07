/// <reference types="@cloudflare/vitest-pool-workers" />
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { SELF } from 'cloudflare:test';
import { ensureTestSchema, resetTestData } from './setup';

type ProfileResponse = {
  userId: string;
  defaultCurrency: string;
  consentAccepted: boolean;
  consentVersion?: number | null;
  rfc?: string | null;
};
type DashboardSummaryResponse = {
  current: { income: number; expense: number; balance: number };
  categories: Array<{ name: string; value: number }>;
};
type CreateTransactionResponse = { id: string };
type BulkCountResponse = { count: number };
type TransactionListResponse = { items: Array<unknown> };
type TransactionResponse = { category: string };

describe('Billi Feature Set Integration', () => {
  beforeAll(ensureTestSchema);
  beforeEach(resetTestData);


  describe('CORS preflight', () => {
    it('allows the current staging Pages origin', async () => {
      const res = await SELF.fetch('http://example.com/api/me', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://billi-web-staging.pages.dev',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe(
        'https://billi-web-staging.pages.dev',
      );
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
      expect(res.headers.get('access-control-allow-headers')).toContain('Authorization');
    });
  });
  describe('User Profile & Consent (/api/me)', () => {
    it('GET /api/me upserts a new user and returns default profile', async () => {
      const res = await SELF.fetch('http://example.com/api/me', {
        headers: { Authorization: 'Bearer user_new' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as ProfileResponse;
      expect(body.userId).toBe('user_new');
      expect(body.defaultCurrency).toBe('MXN');
      expect(body.consentAccepted).toBe(false);
    });

    it('PATCH /api/me updates RFC and currency', async () => {
      // Must call GET first to upsert the user record
      await SELF.fetch('http://example.com/api/me', {
        headers: { Authorization: 'Bearer user_123' },
      });

      const res = await SELF.fetch('http://example.com/api/me', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer user_123',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ rfc: 'ABCD123456EFG', defaultCurrency: 'USD' }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as ProfileResponse;
      expect(body.rfc).toBe('ABCD123456EFG');
      expect(body.defaultCurrency).toBe('USD');
    });

    it('POST /api/me/consent updates consent status', async () => {
      // 1. Create user first
      await SELF.fetch('http://example.com/api/me', {
        headers: { Authorization: 'Bearer user_123' },
      });

      // 2. Accept consent
      const res = await SELF.fetch('http://example.com/api/me/consent', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_123',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ version: 1, acceptedAt: Math.floor(Date.now() / 1000) }),
      });
      expect(res.status).toBe(204);

      // 3. Verify status
      const meRes = await SELF.fetch('http://example.com/api/me', {
        headers: { Authorization: 'Bearer user_123' },
      });
      const me = (await meRes.json()) as ProfileResponse;
      expect(me.consentAccepted).toBe(true);
      expect(me.consentVersion).toBe(1);
    });
  });

  describe('Dashboard & Bulk Ops', () => {
    it('GET /api/dashboard/summary aggregates income and expense', async () => {
      // 1. Setup transactions
      const headers = {
        Authorization: 'Bearer user_dash',
        'content-type': 'application/json',
      };
      
      // Expense: 100.00 MXN (10000 cents)
      await SELF.fetch('http://example.com/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'expense',
          amountCents: 10000,
          category: 'Food',
          occurredAt: Math.floor(Date.now() / 1000)
        }),
      });

      // Income: 500.00 MXN (50000 cents)
      await SELF.fetch('http://example.com/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'income',
          amountCents: 50000,
          category: 'Salary',
          occurredAt: Math.floor(Date.now() / 1000)
        }),
      });

      // 2. Check summary
      const res = await SELF.fetch('http://example.com/api/dashboard/summary', {
        headers: { Authorization: 'Bearer user_dash' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as DashboardSummaryResponse;
      
      // API returns values in cents
      expect(body.current.income).toBe(50000);
      expect(body.current.expense).toBe(10000);
      expect(body.current.balance).toBe(40000);
      expect(body.categories).toContainEqual({ name: 'Food', value: 10000 });
    });

    it('POST /api/transactions/bulk-delete removes multiple items', async () => {
      const headers = {
        Authorization: 'Bearer user_bulk',
        'content-type': 'application/json',
      };

      const res1 = await SELF.fetch('http://example.com/api/transactions', {
        method: 'POST', headers, body: JSON.stringify({ type: 'expense', amountCents: 100, category: 'A', occurredAt: 1 })
      });
      const { id: id1 } = (await res1.json()) as CreateTransactionResponse;

      const res2 = await SELF.fetch('http://example.com/api/transactions', {
        method: 'POST', headers, body: JSON.stringify({ type: 'expense', amountCents: 200, category: 'B', occurredAt: 2 })
      });
      const { id: id2 } = (await res2.json()) as CreateTransactionResponse;

      const bulkRes = await SELF.fetch('http://example.com/api/transactions/bulk-delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: [id1, id2] }),
      });
      expect(bulkRes.status).toBe(200);
      const { count } = (await bulkRes.json()) as BulkCountResponse;
      expect(count).toBe(2);

      const listRes = await SELF.fetch('http://example.com/api/transactions', {
        headers: { Authorization: 'Bearer user_bulk' },
      });
      const { items } = (await listRes.json()) as TransactionListResponse;
      expect(items.length).toBe(0);
    });

    it('PATCH /api/transactions/bulk-category updates categories in bulk', async () => {
      const headers = {
        Authorization: 'Bearer user_bulk_cat',
        'content-type': 'application/json',
      };

      const res1 = await SELF.fetch('http://example.com/api/transactions', {
        method: 'POST', headers, body: JSON.stringify({ type: 'expense', amountCents: 100, category: 'Old', occurredAt: 1 })
      });
      const { id: id1 } = (await res1.json()) as CreateTransactionResponse;

      await SELF.fetch('http://example.com/api/transactions/bulk-category', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ ids: [id1], category: 'New' }),
      });

      const getRes = await SELF.fetch(`http://example.com/api/transactions/${id1}`, {
        headers: { Authorization: 'Bearer user_bulk_cat' },
      });
      const tx = (await getRes.json()) as TransactionResponse;
      expect(tx.category).toBe('New');
    });
  });

  describe('Export', () => {
    it('GET /api/transactions/export returns CSV content', async () => {
      const headers = {
        Authorization: 'Bearer user_export',
        'content-type': 'application/json',
      };
      await SELF.fetch('http://example.com/api/transactions', {
        method: 'POST', headers, body: JSON.stringify({ type: 'expense', amountCents: 10000, category: 'Food', occurredAt: 1714651200, note: 'Tacos' })
      });

      const res = await SELF.fetch('http://example.com/api/transactions/export', {
        headers: { Authorization: 'Bearer user_export' },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/csv');
      const text = await res.text();
      expect(text).toContain('Tacos');
      expect(text).toContain('100.00');
    });
  });
});
