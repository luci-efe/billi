// KV-backed sliding-window rate limiter.
//
// Soft limit: KV is eventually consistent across colos, so concurrent updates
// from different edges may briefly under-count. That is acceptable for the
// abuse-prevention tier we need on /api/ai/chat and /api/capture.
//
// Fail-open policy: when the KV binding is missing (local dev without a
// namespace, vitest unit tests, or a transient KV outage) we allow the
// request. This keeps the dev loop and tests working without binding setup
// and avoids turning a KV outage into a service outage.

import type { KVNamespace } from '@cloudflare/workers-types';

export interface RateLimitOptions {
  /** Sliding window length in seconds. */
  windowSec: number;
  /** Max requests allowed within the window. */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch ms at which the oldest counted timestamp falls out of the window.
   *  0 when the limiter fails open or there is no recorded history. */
  resetAt: number;
}

interface StoredEntry {
  ts: number[];
}

export async function rateLimit(
  kv: KVNamespace | undefined,
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  // No binding → fail open. Documented above.
  if (!kv) {
    return { allowed: true, remaining: opts.max, resetAt: 0 };
  }

  const now = Date.now();
  const windowMs = opts.windowSec * 1000;
  const storeKey = `rl:${key}`;

  try {
    const raw = await kv.get(storeKey, 'json');
    const prior: number[] = Array.isArray((raw as StoredEntry | null)?.ts)
      ? (raw as StoredEntry).ts
      : [];

    // Drop timestamps outside the window.
    const fresh = prior.filter((t) => now - t < windowMs);

    if (fresh.length >= opts.max) {
      // Reject; do not record this attempt (otherwise a burst keeps the door
      // shut forever). resetAt = oldest timestamp + window.
      const resetAt = (fresh[0] ?? now) + windowMs;
      // Best-effort persist of the trimmed list so storage doesn't grow.
      if (fresh.length !== prior.length) {
        await kv
          .put(storeKey, JSON.stringify({ ts: fresh }), {
            expirationTtl: opts.windowSec,
          })
          .catch(() => {});
      }
      return { allowed: false, remaining: 0, resetAt };
    }

    fresh.push(now);
    await kv.put(storeKey, JSON.stringify({ ts: fresh }), {
      expirationTtl: opts.windowSec,
    });

    const remaining = Math.max(0, opts.max - fresh.length);
    const resetAt = (fresh[0] ?? now) + windowMs;
    return { allowed: true, remaining, resetAt };
  } catch (err) {
    // KV failure → fail open, log, do not 500.
    console.error('rateLimit KV error, failing open:', err);
    return { allowed: true, remaining: opts.max, resetAt: 0 };
  }
}
