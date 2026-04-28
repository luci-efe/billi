import { describe, it, expect, vi, afterEach } from 'vitest';
import type { KVNamespace } from '@cloudflare/workers-types';
import { rateLimit } from '../rate-limit';

// Minimal in-memory KV stand-in. Implements just the surface that
// rate-limit.ts touches: get(key, 'json'), put(key, value, opts).
function makeMemoryKV(): KVNamespace {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string, type?: string) {
      const raw = store.get(key);
      if (raw == null) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
  return kv as unknown as KVNamespace;
}

describe('rateLimit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fails open when KV is undefined', async () => {
    const result = await rateLimit(undefined, 'ai:user_1', {
      windowSec: 60,
      max: 30,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(30);
    expect(result.resetAt).toBe(0);
  });

  it('allows up to max within the window and rejects the next', async () => {
    const kv = makeMemoryKV();
    for (let i = 0; i < 30; i++) {
      const r = await rateLimit(kv, 'ai:user_1', { windowSec: 60, max: 30 });
      expect(r.allowed).toBe(true);
    }
    const denied = await rateLimit(kv, 'ai:user_1', { windowSec: 60, max: 30 });
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.resetAt).toBeGreaterThan(Date.now());
  });

  it('decrements remaining as calls accumulate', async () => {
    const kv = makeMemoryKV();
    const a = await rateLimit(kv, 'ai:user_1', { windowSec: 60, max: 3 });
    const b = await rateLimit(kv, 'ai:user_1', { windowSec: 60, max: 3 });
    const c = await rateLimit(kv, 'ai:user_1', { windowSec: 60, max: 3 });
    expect(a.remaining).toBe(2);
    expect(b.remaining).toBe(1);
    expect(c.remaining).toBe(0);
    expect(a.allowed && b.allowed && c.allowed).toBe(true);
  });

  it('resets after the window slides past prior timestamps', async () => {
    const kv = makeMemoryKV();
    const t0 = 1_800_000_000_000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);

    for (let i = 0; i < 3; i++) {
      const r = await rateLimit(kv, 'ai:user_1', { windowSec: 60, max: 3 });
      expect(r.allowed).toBe(true);
    }
    const denied = await rateLimit(kv, 'ai:user_1', { windowSec: 60, max: 3 });
    expect(denied.allowed).toBe(false);

    // Slide past the 60-second window.
    dateSpy.mockReturnValue(t0 + 61_000);

    const allowed = await rateLimit(kv, 'ai:user_1', { windowSec: 60, max: 3 });
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(2);
  });

  it('isolates keys (different users do not share counters)', async () => {
    const kv = makeMemoryKV();
    for (let i = 0; i < 3; i++) {
      await rateLimit(kv, 'ai:user_1', { windowSec: 60, max: 3 });
    }
    const otherUser = await rateLimit(kv, 'ai:user_2', {
      windowSec: 60,
      max: 3,
    });
    expect(otherUser.allowed).toBe(true);
    expect(otherUser.remaining).toBe(2);
  });

  it('fails open when KV throws', async () => {
    const kv = {
      get: vi.fn(async () => {
        throw new Error('kv down');
      }),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as KVNamespace;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await rateLimit(kv, 'ai:user_1', {
      windowSec: 60,
      max: 30,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(30);
  });
});
