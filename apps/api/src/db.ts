import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@billi/db/schema';
import type { Env } from './env';

// Create a Drizzle client per request. The libSQL client is cheap to
// instantiate, and per-request isolation is the Workers-friendly pattern.
export function createDb(env: Env) {
  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

export type DB = ReturnType<typeof createDb>;
