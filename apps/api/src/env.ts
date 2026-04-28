// Worker runtime bindings. Populated from wrangler.toml / .dev.vars / secrets.
// Every variable is a secret-or-config at runtime — none are bundled.
import type { R2Bucket, KVNamespace, D1Database } from '@cloudflare/workers-types';

export interface Env {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY?: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  OPENROUTER_API_KEY: string;
  // Non-secret defaults from wrangler.toml [vars]; optional so tests can omit.
  BILLI_LLM_MODEL?: string;
  BILLI_VISION_MODEL?: string;
  /** Deploy target. "local" / "test" / "staging" / "production". */
  BILLI_ENV?: 'local' | 'test' | 'staging' | 'production' | string;
  // R2 binding for uploaded source documents.
  DOCUMENTS_BUCKET: R2Bucket;
  /** KV namespace backing the rate limiter on /api/ai/chat and /api/capture.
   *  Required in `staging` / `production`; the Worker refuses to dispatch
   *  /api/* without it. Optional in tests / local-dev. */
  AI_CHAT_RATE_LIMIT?: KVNamespace;
  // Test-only D1 binding. Production runs against Turso via the libsql web
  // client. The Workers/vitest pool cannot open libsql `file:` URLs, so the
  // test middleware in src/index.ts swaps in a drizzle-orm/d1 session backed
  // by this miniflare-provided in-memory D1 database.
  BILLI_DB?: D1Database;
}
