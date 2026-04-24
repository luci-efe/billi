import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { eq } from 'drizzle-orm';
import { users } from '@billi/db/schema';
import type { Env } from './env';
import { createDb } from './db';

type Variables = {
  userId: string;
  db: ReturnType<typeof createDb>;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Clerk auth — verifies the JWT on every /api/* request using Clerk's JWKS.
// `getAuth(c)` returns null when the request is unauthenticated.
app.use('/api/*', clerkMiddleware());

// Session gate. Every handler below can rely on c.get('userId') existing.
app.use('/api/*', async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  c.set('userId', auth.userId);
  c.set('db', createDb(c.env));
  await next();
});

// Public health check (mounted outside /api/* guard on purpose).
app.get('/health', (c) => c.json({ ok: true, service: 'billi-api' }));

// GET /api/me
//
// On first authenticated request we upsert the users mirror row from the Clerk
// JWT claims. This keeps domain FKs stable without needing a webhook in MVP.
// Subsequent calls are a cheap no-op upsert.
app.get('/api/me', async (c) => {
  const userId = c.get('userId');
  const db = c.get('db');
  const auth = getAuth(c)!;
  const email = (auth.sessionClaims?.email as string | undefined) ?? '';

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

// Feature routes land here as they're built:
//   app.route('/api/transactions', transactionsRouter)   // BIL-4
//   app.route('/api/transactions/export.csv', exportRouter) // BIL-18

export default app;
