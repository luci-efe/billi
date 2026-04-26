import { sqliteTable, text, integer, check, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),                         // ULID, generated in Worker
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),                        // "income" | "expense"
    amountCents: integer("amount_cents").notNull(),       // > 0
    currency: text("currency").notNull().default("MXN"),  // ISO-4217
    category: text("category").notNull(),                 // length 1..32
    occurredAt: integer("occurred_at").notNull(),         // unix seconds
    source: text("source").notNull(),                     // form|text|voice|image|chat
    sourceRef: text("source_ref"),                        // future R2 key
    note: text("note"),                                   // length 0..280
    createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at"),
  },
  (t) => ({
    typeChk: check("transactions_type_chk", sql`${t.type} IN ('income','expense')`),
    amountChk: check("transactions_amount_chk", sql`${t.amountCents} > 0`),
    categoryLenChk: check("transactions_cat_len_chk", sql`length(${t.category}) BETWEEN 1 AND 32`),
    sourceChk: check(
      "transactions_source_chk",
      sql`${t.source} IN ('form','text','voice','image','chat')`
    ),
    noteLenChk: check("transactions_note_len_chk", sql`${t.note} IS NULL OR length(${t.note}) <= 280`),
    ownerTimeIdx: index("tx_owner_time_idx").on(t.ownerId, t.occurredAt),
    ownerCatIdx: index("tx_owner_cat_idx").on(t.ownerId, t.category),
    ownerTypeIdx: index("tx_owner_type_idx").on(t.ownerId, t.type),
  })
);

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
