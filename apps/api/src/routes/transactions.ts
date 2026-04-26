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
  deleteTransaction 
} from "@billi/db/repos/transactions";
import type { Env } from "../env";
import type { createDb } from "../db";

type Variables = {
  userId: string;
  db: ReturnType<typeof createDb>;
};

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/transactions
router.post("/", zValidator("json", newTransactionSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const body = c.req.valid("json");

  const id = ulid();
  await createTransaction(db, userId, {
    ...body,
    id,
  } as any);

  return c.json({ id }, 201);
});

// GET /api/transactions
router.get("/", zValidator("query", listFilterSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const query = c.req.valid("query");

  const filter: any = {
    type: query.type,
    category: query.category,
    from: query.from,
    to: query.to,
    limit: query.limit,
    cursor: query.cursor,
  };

  const result = await listTransactions(db, userId, filter);
  return c.json(result);
});

// GET /api/transactions/:id
router.get("/:id", zValidator("param", transactionIdParamSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const tx = await getTransactionById(db, id, userId);
  if (!tx) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.json(tx);
});

// PATCH /api/transactions/:id
router.patch(
  "/:id",
  zValidator("param", transactionIdParamSchema),
  zValidator("json", updateTransactionSchema),
  async (c) => {
    const userId = c.get("userId");
    const db = c.get("db");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const patch: any = {
      type: body.type,
      amountCents: body.amountCents,
      currency: body.currency,
      category: body.category,
      occurredAt: body.occurredAt,
      source: body.source,
      sourceRef: body.sourceRef,
      note: body.note,
    };

    const updated = await updateTransaction(db, id, userId, patch);
    if (!updated) {
      return c.json({ error: "not_found" }, 404);
    }

    return c.json(updated);
  }
);

// DELETE /api/transactions/:id
router.delete("/:id", zValidator("param", transactionIdParamSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const deleted = await deleteTransaction(db, id, userId);
  if (!deleted) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.body(null, 204);
});

export default router;
