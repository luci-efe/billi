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
router.post("/", zValidator("json", newTransactionSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const body = c.req.valid("json");

  const id = ulid();
  // @ts-expect-error - input needs id which is added here
  const input: NewTransaction & { id: string } = {
    ...body,
    id,
  };
  
  await createTransaction(db, userId, input);

  return c.json({ id }, 201);
});

// GET /api/transactions
router.get("/", zValidator("query", listFilterSchema), async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const query = c.req.valid("query");

  const filter: ListFilter = {};
  if (query.type) filter.type = query.type as "income" | "expense";
  if (query.category) filter.category = query.category;
  if (query.from !== undefined) filter.from = query.from;
  if (query.to !== undefined) filter.to = query.to;
  if (query.limit !== undefined) filter.limit = query.limit;
  if (query.cursor) filter.cursor = query.cursor;

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

    const patch: Partial<NewTransaction> = {};
    if (body.type) patch.type = body.type as "income" | "expense";
    if (body.amountCents !== undefined) patch.amountCents = body.amountCents;
    if (body.currency) patch.currency = body.currency;
    if (body.category) patch.category = body.category;
    if (body.occurredAt !== undefined) patch.occurredAt = body.occurredAt;
    if (body.source) patch.source = body.source as "form" | "text" | "voice" | "image" | "chat";
    if (body.sourceRef !== undefined) patch.sourceRef = body.sourceRef;
    if (body.note !== undefined) patch.note = body.note;

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
