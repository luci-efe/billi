import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema/index';

export interface DbConfig {
  url: string;
  authToken?: string;
}

// Factory for a Drizzle client bound to our schema. The Worker and any local
// scripts share this factory so the schema import path is canonical.
//
// authToken is spread conditionally because @libsql/client's `Config` type
// under `exactOptionalPropertyTypes: true` refuses `authToken: undefined` —
// the property must be absent or a string, never explicitly set to undefined.
export function createDbClient(config: DbConfig) {
  const client: Client = createClient({
    url: config.url,
    ...(config.authToken ? { authToken: config.authToken } : {}),
  });
  return drizzle(client, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;
