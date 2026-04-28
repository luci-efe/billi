import type { Mastra } from '@mastra/core';
import type { Env } from '../env';

const mastraCache = new WeakMap<Env, Promise<Mastra>>();

/**
 * Lazy Mastra factory. Every Mastra package is loaded via dynamic `import()`
 * so the bundle does not run its module-init code (which calls
 * `crypto.randomUUID()`) in Cloudflare Workers global scope. Must only be
 * called inside the request handler.
 *
 * Returns a cached `Promise<Mastra>` per `Env` so concurrent requests on a
 * cold isolate share a single construction.
 */
export function getMastra(env: Env): Promise<Mastra> {
  const cached = mastraCache.get(env);
  if (cached) return cached;

  const promise = (async () => {
    // In test mode, swap LibSQL for an in-memory store so workflow runs
    // never hit the network. Production paths stay on Turso/libsql.
    const isTest = __BILLI_TEST__;
    const [
      { Mastra },
      libsqlMod,
      storageMod,
      { getBilliAgent },
      { buildChatbotWorkflow },
      { buildCaptureWorkflow },
    ] = await Promise.all([
      import('@mastra/core'),
      isTest ? Promise.resolve({ LibSQLStore: null }) : import('@mastra/libsql'),
      isTest ? import('@mastra/core/storage') : Promise.resolve(null),
      import('./agents'),
      import('./workflows/chatbot'),
      import('./workflows/capture'),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage: any = isTest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? new (storageMod as any).InMemoryStore()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : new (libsqlMod as any).LibSQLStore({
          id: 'billi-storage',
          url: env.TURSO_DATABASE_URL,
          ...(env.TURSO_AUTH_TOKEN ? { authToken: env.TURSO_AUTH_TOKEN } : {}),
        });

    const [billiAgent, chatbot, capture] = await Promise.all([
      getBilliAgent(env),
      buildChatbotWorkflow(),
      buildCaptureWorkflow(),
    ]);

    return new Mastra({
      storage,
      agents: { billiAgent },
      workflows: { chatbotWorkflow: chatbot.workflow, captureWorkflow: capture.workflow },
    });
  })();

  mastraCache.set(env, promise);
  return promise;
}
