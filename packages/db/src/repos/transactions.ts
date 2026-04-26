import { eq, and, gte, lte, desc, lt, or } from "drizzle-orm";
import { transactions, type TransactionRow } from "../schema/transactions";
import type { DbClient } from "../client";

export interface NewTransaction {
  type: "income" | "expense";
  amountCents: number;
  currency?: string;
  category: string;
  occurredAt: number;
  source: "form" | "text" | "voice" | "image" | "chat";
  sourceRef?: string | null;
  note?: string | null;
}

export interface ListFilter {
  from?: number;
  to?: number;
  type?: "income" | "expense";
  category?: string;
  limit?: number;
  cursor?: string;
}

export type Transaction = TransactionRow;

// Use a type-safe way to access globals that works in both Node, Bun, and Workers
declare const btoa: ((str: string) => string) | undefined;
declare const atob: ((str: string) => string) | undefined;

/**
 * Encodes keyset (occurredAt, id) into a base64 string
 */
function encodeCursor(occurredAt: number, id: string): string {
  const str = JSON.stringify({ occurredAt, id });
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // @ts-ignore
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString("base64");
  }
  return str;
}

/**
 * Decodes base64 string into keyset (occurredAt, id)
 */
function decodeCursor(cursor: string): { occurredAt: number; id: string } | null {
  try {
    let decoded = '';
    if (typeof atob !== 'undefined') {
      decoded = atob(cursor);
    } else {
      // @ts-ignore
      if (typeof Buffer !== 'undefined') {
        decoded = Buffer.from(cursor, "base64").toString("utf-8");
      } else {
        decoded = cursor;
      }
    }
    const parsed = JSON.parse(decoded);
    if (typeof parsed.occurredAt === "number" && typeof parsed.id === "string") {
      return parsed;
    }
  } catch {
    // Invalid cursor
  }
  return null;
}

export async function createTransaction(
  db: DbClient,
  ownerId: string,
  input: NewTransaction & { id: string }
): Promise<{ id: string }> {
  await db.insert(transactions).values({
    id: input.id,
    ownerId,
    type: input.type,
    amountCents: input.amountCents,
    currency: input.currency ?? "MXN",
    category: input.category,
    occurredAt: input.occurredAt,
    source: input.source,
    sourceRef: input.sourceRef ?? null,
    note: input.note ?? null,
  });
  return { id: input.id };
}

export async function getTransactionById(
  db: DbClient,
  id: string,
  ownerId: string
): Promise<Transaction | null> {
  const result = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.ownerId, ownerId)))
    .get();
  return result ?? null;
}

export async function listTransactions(
  db: DbClient,
  ownerId: string,
  filter: ListFilter
): Promise<{ items: Transaction[]; nextCursor?: string }> {
  const limit = Math.min(filter.limit ?? 50, 200);
  const whereClauses = [eq(transactions.ownerId, ownerId)];

  if (filter.from !== undefined) {
    whereClauses.push(gte(transactions.occurredAt, filter.from));
  }
  if (filter.to !== undefined) {
    whereClauses.push(lte(transactions.occurredAt, filter.to));
  }
  if (filter.type) {
    whereClauses.push(eq(transactions.type, filter.type));
  }
  if (filter.category) {
    whereClauses.push(eq(transactions.category, filter.category));
  }

  const cursor = filter.cursor ? decodeCursor(filter.cursor) : null;
  if (cursor) {
    whereClauses.push(
      or(
        lt(transactions.occurredAt, cursor.occurredAt),
        and(eq(transactions.occurredAt, cursor.occurredAt), lt(transactions.id, cursor.id))
      )!
    );
  }

  const items = await db
    .select()
    .from(transactions)
    .where(and(...whereClauses))
    .orderBy(desc(transactions.occurredAt), desc(transactions.id))
    .limit(limit);

  if (items.length === limit && items.length > 0) {
    const lastItem = items[items.length - 1];
    if (lastItem) {
      return {
        items,
        nextCursor: encodeCursor(lastItem.occurredAt, lastItem.id),
      };
    }
  }

  return { items };
}

export async function updateTransaction(
  db: DbClient,
  id: string,
  ownerId: string,
  patch: Partial<NewTransaction>
): Promise<Transaction | null> {
  const now = Math.floor(Date.now() / 1000);
  
  const values: any = {
    updatedAt: now,
  };

  if (patch.type) values.type = patch.type;
  if (patch.amountCents !== undefined) values.amountCents = patch.amountCents;
  if (patch.currency) values.currency = patch.currency;
  if (patch.category) values.category = patch.category;
  if (patch.occurredAt !== undefined) values.occurredAt = patch.occurredAt;
  if (patch.source) values.source = patch.source;
  if (patch.sourceRef !== undefined) values.sourceRef = patch.sourceRef;
  if (patch.note !== undefined) values.note = patch.note;

  await db
    .update(transactions)
    .set(values)
    .where(and(eq(transactions.id, id), eq(transactions.ownerId, ownerId)));

  return getTransactionById(db, id, ownerId);
}

export async function deleteTransaction(
  db: DbClient,
  id: string,
  ownerId: string
): Promise<boolean> {
  const result = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.ownerId, ownerId)))
    .returning({ id: transactions.id });
  
  return result.length > 0;
}
