import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users } from '@billi/db/schema';
import type { Env } from './env';
import { createDb } from './db';

type Variables = {
  userId: string;
  db: ReturnType<typeof createDb>;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Auth middleware
app.use('/api/*', async (c, next) => {
  // Use globalThis to safely check for VITEST without process.env in Workers
  const isTest = c.env.VITEST === 'true' || (globalThis as Record<string, unknown>).VITEST === 'true';
  
  if (isTest) {
    // Simple mock auth for tests
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'unauthenticated' }, 401);
    }
    const userId = authHeader.replace('Bearer ', '');
    c.set('userId', userId);
    c.set('db', createDb(c.env));
    await next();
  } else {
    // Dynamically import Clerk dependencies to avoid ESM/CJS issues in Vitest
    const { clerkMiddleware, getAuth } = await import('@hono/clerk-auth');
    
    let nextCalled = false;
    const result = await clerkMiddleware()(c, async () => {
      nextCalled = true;
    });

    if (result) return result;
    
    if (nextCalled) {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: 'unauthenticated' }, 401);
      }
      c.set('userId', auth.userId);
      c.set('db', createDb(c.env));
      await next();
    }
  }
});

// Public health check (mounted outside /api/* guard on purpose).
app.get('/health', (c) => c.json({ ok: true, service: 'billi-api' }));

// GET /api/me
app.get('/api/me', async (c) => {
  const userId = c.get('userId');
  const db = c.get('db');
  
  const isTest = c.env.VITEST === 'true' || (globalThis as Record<string, unknown>).VITEST === 'true';
  let email = '';
  if (!isTest) {
    const { getAuth } = await import('@hono/clerk-auth');
    const auth = getAuth(c)!;
    email = (auth.sessionClaims?.email as string | undefined) ?? '';
  } else {
    email = 'test@example.com';
  }

  await db
    .insert(users)
    .values({ id: userId, email })
    .onConflictDoUpdate({
      target: users.id,
      set: { email },
    });

  const row = await db.select().from(users).where(eq(users.id, userId)).get();

  return c.json({
    userId,
    email: row?.email ?? email,
    consentVersion: row?.consentV ?? null,
    consentAccepted: row?.consentV != null,
  });
});

// POST /api/me/consent  { version: number, acceptedAt: number }
app.post('/api/me/consent', async (c) => {
  const userId = c.get('userId');
  const db = c.get('db');
  const body = await c.req.json<{ version?: unknown; acceptedAt?: unknown }>();
  const version = Number(body.version);
  const acceptedAt = Number(body.acceptedAt);
  if (!Number.isInteger(version) || version < 1) {
    return c.json({ error: 'invalid_version' }, 400);
  }
  if (!Number.isInteger(acceptedAt) || acceptedAt < 0) {
    return c.json({ error: 'invalid_accepted_at' }, 400);
  }
  await db
    .update(users)
    .set({ consentV: version, consentAt: acceptedAt })
    .where(eq(users.id, userId));
  return c.body(null, 204);
});

import transactionsRouter from './routes/transactions';

// Feature routes land here as they're built:
app.route('/api/transactions', transactionsRouter);

export default app;
