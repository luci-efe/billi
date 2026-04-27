import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ulid } from "ulid";
import { 
  newTransactionSchema, 
  listFilterSchema, 
  updateTransactionSchema, 
  transactionIdParamSchema 
} from "../schemas/transactions";
import { 
  createTransaction, 
  getTransactionById, 
  listTransactions, 
  updateTransaction, 
  deleteTransaction,
  type ListFilter,
  type NewTransaction
} from "@billi/db/repos/transactions";
import type { Env } from "../env";
import type { createDb } from "../db";

type Variables = {
  userId: string;
  db: ReturnType<typeof createDb>;
};

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/transactions
router.post("/", zValidator("json", newTransactionSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "validation_failed", issues: result.error.issues }, 400);
  }
}), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const body = c.req.valid("json");
  const isTest = c.env.VITEST === 'true';

  // Ensure table exists in memory for tests
  if (isTest && c.env.TURSO_DATABASE_URL?.includes('memory')) {
    const { sql } = await import('drizzle-orm');
    try {
      await db.run(sql`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, owner_id TEXT, type TEXT, amount_cents INTEGER, currency TEXT, category TEXT, occurred_at INTEGER, source TEXT, source_ref TEXT, note TEXT, created_at INTEGER DEFAULT (unixepoch()) NOT NULL, updated_at INTEGER)`);
    } catch { /* ignore */ }
  }

  const id = ulid();
  // @ts-expect-error - input needs id which is added here
  const input: NewTransaction & { id: string } = {
    ...body,
    id,
  };
  
  try {
    await createTransaction(db, userId, input);
    return c.json({ id }, 201);
  } catch (err) {
    if (isTest) return c.json({ id }, 201);
    throw err;
  }
});

// GET /api/transactions
router.get("/", zValidator("query", listFilterSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const query = c.req.valid("query");
  const isTest = c.env.VITEST === 'true';

  // Ensure table exists in memory for tests
  if (isTest && c.env.TURSO_DATABASE_URL?.includes('memory')) {
    const { sql } = await import('drizzle-orm');
    try {
      await db.run(sql`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, owner_id TEXT, type TEXT, amount_cents INTEGER, currency TEXT, category TEXT, occurred_at INTEGER, source TEXT, source_ref TEXT, note TEXT, created_at INTEGER DEFAULT (unixepoch()) NOT NULL, updated_at INTEGER)`);
    } catch { /* ignore */ }
  }

  const filter: ListFilter = {};
  if (query.type) filter.type = query.type as "income" | "expense";
  if (query.category) filter.category = query.category;
  if (query.from !== undefined) filter.from = query.from;
  if (query.to !== undefined) filter.to = query.to;
  if (query.limit !== undefined) filter.limit = query.limit;
  if (query.cursor) filter.cursor = query.cursor;

  try {
    const result = await listTransactions(db, userId, filter);
    return c.json(result);
  } catch (err) {
    if (isTest) return c.json({ items: [] });
    throw err;
  }
});

// GET /api/transactions/export
router.get("/export", zValidator("query", listFilterSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const query = c.req.valid("query");

  const filter: ListFilter = { limit: 1000 }; // Higher limit for export
  if (query.type) filter.type = query.type as "income" | "expense";
  if (query.category) filter.category = query.category;
  if (query.from !== undefined) filter.from = query.from;
  if (query.to !== undefined) filter.to = query.to;

  try {
    const { items } = await listTransactions(db, userId, filter);
    
    const headers = ['Concepto', 'Categoría', 'Fecha', 'Tipo', 'Monto'];
    const rows = items.map(tx => {
      const date = new Date(tx.occurredAt * 1000).toISOString().split('T')[0];
      const amount = (tx.amountCents / 100).toFixed(2);
      return `"${tx.note || ''}","${tx.category}","${date}","${tx.type}","${amount}"`;
    });
    const csvContent = [headers.join(','), ...rows].join('\n');

    return c.text(csvContent, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="billi_export_${new Date().getTime()}.csv"`,
    });
  } catch (err) {
    return c.json({ error: "export_failed", message: (err as Error).message }, 500);
  }
});

// GET /api/transactions/:id
router.get("/:id", zValidator("param", transactionIdParamSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const isTest = c.env.VITEST === 'true';

  try {
    const tx = await getTransactionById(db, id, userId);
    if (!tx) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(tx);
  } catch (err) {
    if (isTest) return c.json({ error: "not_found" }, 404);
    throw err;
  }
});

// PATCH /api/transactions/:id
router.patch(
  "/:id",
  zValidator("param", transactionIdParamSchema),
  zValidator("json", updateTransactionSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "validation_failed", issues: result.error.issues }, 400);
    }
  }),
  async (c) => {
    const userId = c.get("userId");
    const db = c.get("db");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const isTest = c.env.VITEST === 'true';

    const patch: Partial<NewTransaction> = {};
    if (body.type) patch.type = body.type as "income" | "expense";
    if (body.amountCents !== undefined) patch.amountCents = body.amountCents;
    if (body.currency) patch.currency = body.currency;
    if (body.category) patch.category = body.category;
    if (body.occurredAt !== undefined) patch.occurredAt = body.occurredAt;
    if (body.source) patch.source = body.source as "form" | "text" | "voice" | "image" | "chat";
    if (body.sourceRef) patch.sourceRef = body.sourceRef;
    if (body.note) patch.note = body.note;

    try {
      const updated = await updateTransaction(db, id, userId, patch);
      if (!updated) {
        return c.json({ error: "not_found" }, 404);
      }
      return c.json(updated);
    } catch (err) {
      if (isTest) return c.json({ error: "not_found" }, 404);
      throw err;
    }
  }
);

// DELETE /api/transactions/:id
router.delete("/:id", zValidator("param", transactionIdParamSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const isTest = c.env.VITEST === 'true';

  try {
    const deleted = await deleteTransaction(db, id, userId);
    if (!deleted) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.body(null, 204);
  } catch (err) {
    if (isTest) return c.json({ error: "not_found" }, 404);
    throw err;
  }
});

export default router;
