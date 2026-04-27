import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { billiAgent } from './agents';
import type { Env } from '../env';

export function getMastra(env: Env) {
  const storage = new LibSQLStore({
    id: 'billi-storage',
    url: env.TURSO_DATABASE_URL,
    ...(env.TURSO_AUTH_TOKEN ? { authToken: env.TURSO_AUTH_TOKEN } : {}),
  });

  return new Mastra({
    storage,
    agents: { billiAgent },
  });
}

// Temporary static export for CLI migrations
export const mastra = new Mastra({
  storage: new LibSQLStore({
    id: 'billi-storage-migration',
    url: process.env.TURSO_DATABASE_URL || 'libsql://temp.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  }),
  agents: { billiAgent },
});
