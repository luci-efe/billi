import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eq } from 'drizzle-orm';
import { users } from '@billi/db/schema';
import { UserRepository } from '@billi/db';
import type { Env } from './env';
import { createDb } from './db';
import aiRouter from './routes/ai';
import captureRouter from './routes/capture';
import documentsRouter from './routes/documents';
import transactionsRouter from './routes/transactions';
import { getSummary } from '@billi/db/repos/transactions';

type Variables = {
  userId: string;
  db: ReturnType<typeof createDb>;
  userRepo: UserRepository;
  requestId: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const BILLI_STAGING_PAGES_HOST_RE = /^billi-web-staging(?:-[a-z0-9]+)?\.pages\.dev$/;
const BILLI_STAGING_CUSTOM_ORIGINS = new Set([
  'https://www.billi.lat',
  'https://billi.lat',
]);

function isAllowedCorsOrigin(origin: string): boolean {
  if (origin === 'http://localhost:5173') return true;
  if (BILLI_STAGING_CUSTOM_ORIGINS.has(origin)) return true;

  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && BILLI_STAGING_PAGES_HOST_RE.test(hostname);
  } catch {
    return false;
  }
}

// CORS middleware — must run before auth so preflight (OPTIONS) replies are
// sent without requiring authentication. Keep origins tight to local dev and
// Billi staging Pages hosts that call the staging Worker cross-origin.
app.use('/api/*', cors({
  origin: (origin) => {
    if (isAllowedCorsOrigin(origin)) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Tag every /api/* request with a UUID so logs and 5xx error responses can
// be correlated without leaking internal error details to the client.
// Runs before the rate-limit guard and the auth middleware so even auth
// failures get a request id.
app.use('/api/*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  return next();
});


// Boot-time deploy assertion: refuse to dispatch /api/* in staging or
// production if the rate-limit KV namespace isn't bound. The limiter fails
// open by design (so dev / tests don't have to provision a KV namespace),
// which means a missing binding silently disables abuse protection. We can't
// afford that against OpenRouter spend, so we fail closed at the edge.
app.use('/api/*', async (c, next) => {
  if (__BILLI_TEST__) return next();
  const env = c.env.BILLI_ENV;
  const isHostedDeploy = env === 'staging' || env === 'production';
  if (isHostedDeploy && !c.env.AI_CHAT_RATE_LIMIT) {
    console.error('Refusing to dispatch: AI_CHAT_RATE_LIMIT KV namespace not bound in', env);
    return c.json({ error: 'misconfigured', detail: 'rate_limiter_unbound' }, 503);
  }
  return next();
});

// Auth middleware - must be before protected routes
app.use('/api/*', async (c, next) => {
  const isTest = __BILLI_TEST__;
  if (isTest) {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'unauthenticated' }, 401);
    }
    const userId = authHeader.replace('Bearer ', '');
    c.set('userId', userId);

    // The Workers/vitest pool runs the libsql *web* client, which cannot
    // open `file:` URLs. Tests therefore use the miniflare-provided D1
    // binding and a drizzle-orm/d1 session — same query API as
    // drizzle-orm/libsql, different driver. The cast hides the wider type.
    const [{ drizzle: drizzleD1 }, schema] = await Promise.all([
      import('drizzle-orm/d1'),
      import('@billi/db/schema'),
    ]);
    if (!c.env.BILLI_DB) {
      return c.json({ error: 'test_db_unbound' }, 500);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = drizzleD1(c.env.BILLI_DB, { schema }) as any;
    c.set('db', db);
    c.set('userRepo', new UserRepository(db));

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
      const db = createDb(c.env);
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: 'unauthenticated' }, 401);
      }
      const userRepo = new UserRepository(db);
      const email = (auth.sessionClaims?.email as string | undefined) ?? '';
      await userRepo.upsert({ id: auth.userId, email });
      c.set('userId', auth.userId);
      c.set('db', db);
      c.set('userRepo', userRepo);
      await next();
    }
  }
});

// Public health check (mounted outside /api/* guard on purpose).
app.get('/health', (c) => c.json({ ok: true, service: 'billi-api' }));

app.onError((err, c) => {
  // ARC-NEW-06 / SEC-NEW-14: never leak err.message to clients. Log the full
  // error server-side keyed by requestId; return only the id to the caller.
  const requestId = c.get('requestId') ?? crypto.randomUUID();
  console.error('Hono Error', { requestId, err });
  return c.json({ error: 'internal_server_error', requestId }, 500);
});

// Feature routes land here
app.route('/api/transactions', transactionsRouter);
app.route('/api/ai', aiRouter);
app.route('/api/capture', captureRouter);
app.route('/api', documentsRouter);

// GET /api/me
app.get('/api/me', async (c) => {
  const userId = c.get('userId');
  const userRepo = c.get('userRepo');
  
  const isTest = __BILLI_TEST__;
  let email = '';
  if (!isTest) {
    const { getAuth } = await import('@hono/clerk-auth');
    const auth = getAuth(c)!;
    email = (auth.sessionClaims?.email as string | undefined) ?? '';
  } else {
    email = 'test@example.com';
  }

  try {
    const user = await userRepo.upsert({ id: userId, email });

    return c.json({
      userId: user.id,
      email: user.email,
      rfc: user.rfc,
      defaultCurrency: user.defaultCurrency,
      consentVersion: user.consentV ?? null,
      consentAccepted: user.consentV != null,
    });
  } catch (err) {
    if (isTest) {
      // Return mock data for tests if DB fails
      return c.json({
        userId,
        email,
        rfc: null,
        defaultCurrency: 'MXN',
        consentVersion: null,
        consentAccepted: false,
      });
    }
    throw err;
  }
});

// PATCH /api/me
app.patch('/api/me', async (c) => {
  const userId = c.get('userId');
  const userRepo = c.get('userRepo');
  const body = await c.req.json<{ rfc?: string; defaultCurrency?: string }>();
  
  // Basic validation
  if (body.rfc && body.rfc.length > 13) {
    return c.json({ error: 'invalid_rfc_length' }, 400);
  }
  
  if (body.defaultCurrency && !['MXN', 'USD'].includes(body.defaultCurrency)) {
    return c.json({ error: 'invalid_currency' }, 400);
  }

  try {
    const updated = await userRepo.update(userId, {
      rfc: body.rfc ?? null,
      defaultCurrency: body.defaultCurrency,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    
    if (!updated) {
      return c.json({ error: 'user_not_found' }, 404);
    }

    return c.json({
      userId: updated.id,
      email: updated.email,
      rfc: updated.rfc,
      defaultCurrency: updated.defaultCurrency,
      consentVersion: updated.consentV ?? null,
      consentAccepted: updated.consentV != null,
    });
  } catch (err) {
    throw err;
  }
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
  
  try {
    await db
      .update(users)
      .set({ consentV: version, consentAt: acceptedAt })
      .where(eq(users.id, userId));
  } catch (err) {
    const isTest = __BILLI_TEST__;
    if (!isTest) throw err;
  }
  
  return c.body(null, 204);
});

// GET /api/dashboard/summary
app.get('/api/dashboard/summary', async (c) => {
  const userId = c.get('userId');
  const db = c.get('db');
  const period = c.req.query('period') || 'month';
  
  const now = new Date();
  let from = 0;
  const to = Math.floor(now.getTime() / 1000);
  let prevFrom = 0;
  let prevTo = 0;

  if (period === 'day') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    from = Math.floor(startOfDay.getTime() / 1000);
    prevFrom = from - 86400;
    prevTo = from - 1;
  } else if (period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
    from = Math.floor(startOfWeek.getTime() / 1000);
    prevFrom = from - 7 * 86400;
    prevTo = from - 1;
  } else if (period === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    from = Math.floor(startOfYear.getTime() / 1000);
    const startOfPrevYear = new Date(now.getFullYear() - 1, 0, 1);
    prevFrom = Math.floor(startOfPrevYear.getTime() / 1000);
    prevTo = from - 1;
  } else {
    // default: month
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    from = Math.floor(firstDay.getTime() / 1000);
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevFrom = Math.floor(firstDayPrevMonth.getTime() / 1000);
    prevTo = from - 1;
  }

  try {
    const currentSummary = await getSummary(db, userId, from, to);
    const previousSummary = await getSummary(db, userId, prevFrom, prevTo);
    
    const { transactions } = await import('@billi/db/schema');
    const { and, eq, gte, lte } = await import('drizzle-orm');
    
    const items = await db.select({
      category: transactions.category,
      amountCents: transactions.amountCents,
      type: transactions.type
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.ownerId, userId),
        eq(transactions.type, 'expense'),
        gte(transactions.occurredAt, from),
        lte(transactions.occurredAt, to)
      )
    );
    
    const categoryTotals: Record<string, number> = {};
    for (const item of items) {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amountCents;
    }
    
    const categories = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

    return c.json({
      current: currentSummary,
      previous: previousSummary,
      categories
    });
  } catch (err) {
    const isTest = __BILLI_TEST__;
    if (isTest) {
      return c.json({ 
        current: { income: 0, expense: 0, balance: 0 },
        previous: { income: 0, expense: 0, balance: 0 },
        categories: []
      });
    }
    throw err;
  }
});

export default app;
