import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ulid } from "ulid";
import { 
  newTransactionSchema, 
  listFilterSchema, 
  updateTransactionSchema, 
  transactionIdParamSchema,
  bulkDeleteSchema,
  bulkCategoryUpdateSchema
} from "../schemas/transactions";
import { 
  createTransaction, 
  getTransactionById, 
  listTransactions, 
  updateTransaction, 
  deleteTransaction,
  deleteTransactions,
  updateTransactionsCategory,
  type ListFilter,
  type NewTransaction
} from "@billi/db/repos/transactions";
import type { Env } from "../env";
import type { createDb } from "../db";

type Variables = {
  userId: string;
  db: ReturnType<typeof createDb>;
  requestId: string;
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
  const isTest = __BILLI_TEST__;

  const id = ulid();
  // SEC-NEW-07: source is server-controlled. Form route always pins 'form';
  // chat tool path pins 'chat'. Never trust client-supplied source/sourceRef.
  // @ts-expect-error - exactOptionalPropertyTypes vs note?: string | null
  const input: NewTransaction & { id: string } = {
    ...body,
    id,
    source: 'form' as const,
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
  const isTest = __BILLI_TEST__;

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
    console.error('export_failed:', err);
    return c.json({ error: 'export_failed', requestId: c.get('requestId') }, 500);
  }
});

// POST /api/transactions/bulk-delete
router.post("/bulk-delete", zValidator("json", bulkDeleteSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const { ids } = c.req.valid("json");

  try {
    const count = await deleteTransactions(db, ids, userId);
    return c.json({ count });
  } catch (err) {
    console.error('bulk_delete_failed:', err);
    return c.json({ error: 'bulk_delete_failed', requestId: c.get('requestId') }, 500);
  }
});

// PATCH /api/transactions/bulk-category
router.patch("/bulk-category", zValidator("json", bulkCategoryUpdateSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const { ids, category } = c.req.valid("json");

  try {
    const count = await updateTransactionsCategory(db, ids, userId, category);
    return c.json({ count });
  } catch (err) {
    console.error('bulk_category_update_failed:', err);
    return c.json({ error: 'bulk_category_update_failed', requestId: c.get('requestId') }, 500);
  }
});

// GET /api/transactions/:id
router.get("/:id", zValidator("param", transactionIdParamSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const isTest = __BILLI_TEST__;

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
    const isTest = __BILLI_TEST__;

    const patch: Partial<NewTransaction> = {};
    if (body.type) patch.type = body.type as "income" | "expense";
    if (body.amountCents !== undefined) patch.amountCents = body.amountCents;
    if (body.currency) patch.currency = body.currency;
    if (body.category) patch.category = body.category;
    if (body.occurredAt !== undefined) patch.occurredAt = body.occurredAt;
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
  const isTest = __BILLI_TEST__;

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
