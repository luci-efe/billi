import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createOpenAI } from '@ai-sdk/openai';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { eq, gte, lte, or, lt, and, desc, sql } from 'drizzle-orm';
import { sqliteTable, integer, text, index, check } from 'drizzle-orm/sqlite-core';

const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().default(""),
  rfc: text("rfc"),
  defaultCurrency: text("default_currency").notNull().default("MXN"),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
  consentV: integer("consent_v"),
  consentAt: integer("consent_at")
});

const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    // ULID, generated in Worker
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    // "income" | "expense"
    amountCents: integer("amount_cents").notNull(),
    // > 0
    currency: text("currency").notNull().default("MXN"),
    // ISO-4217
    category: text("category").notNull(),
    // length 1..32
    occurredAt: integer("occurred_at").notNull(),
    // unix seconds
    source: text("source").notNull(),
    // form|text|voice|image|chat
    sourceRef: text("source_ref"),
    // future R2 key
    note: text("note"),
    // length 0..280
    createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at")
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
    ownerTypeIdx: index("tx_owner_type_idx").on(t.ownerId, t.type)
  })
);

function encodeCursor(occurredAt, id) {
  const str = JSON.stringify({ occurredAt, id });
  if (typeof btoa !== "undefined") {
    return btoa(str);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str).toString("base64");
  }
  return str;
}
function decodeCursor(cursor) {
  try {
    let decoded = "";
    if (typeof atob !== "undefined") {
      decoded = atob(cursor);
    } else {
      if (typeof Buffer !== "undefined") {
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
  }
  return null;
}
async function createTransaction(db, ownerId, input) {
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
    note: input.note ?? null
  });
  return { id: input.id };
}
async function listTransactions(db, ownerId, filter) {
  const limit = Math.min(filter.limit ?? 50, 200);
  const whereClauses = [eq(transactions.ownerId, ownerId)];
  if (filter.from !== void 0) {
    whereClauses.push(gte(transactions.occurredAt, filter.from));
  }
  if (filter.to !== void 0) {
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
      )
    );
  }
  const items = await db.select().from(transactions).where(and(...whereClauses)).orderBy(desc(transactions.occurredAt), desc(transactions.id)).limit(limit);
  if (items.length === limit && items.length > 0) {
    const lastItem = items[items.length - 1];
    if (lastItem) {
      return {
        items,
        nextCursor: encodeCursor(lastItem.occurredAt, lastItem.id)
      };
    }
  }
  return { items };
}
async function getSummary(db, ownerId, from, to) {
  const items = await db.select({
    type: transactions.type,
    amountCents: transactions.amountCents
  }).from(transactions).where(
    and(
      eq(transactions.ownerId, ownerId),
      gte(transactions.occurredAt, from),
      lte(transactions.occurredAt, to)
    )
  );
  let income = 0;
  let expense = 0;
  for (const item of items) {
    if (item.type === "income") {
      income += item.amountCents;
    } else {
      expense += item.amountCents;
    }
  }
  return {
    income,
    expense,
    balance: income - expense
  };
}

const getTransactionsTool = createTool({
  id: "getTransactions",
  description: "Consulta el historial de transacciones del usuario. Puede filtrar por fechas, tipo (ingreso/egreso) o categor\xEDa.",
  inputSchema: z.object({
    type: z.enum(["income", "expense"]).optional(),
    category: z.string().optional(),
    from: z.number().optional().describe("Unix timestamp de inicio"),
    to: z.number().optional().describe("Unix timestamp de fin"),
    limit: z.number().optional().default(10)
  }),
  execute: async ({ type, category, from, to, limit }, { requestContext }) => {
    const db = requestContext?.get("db");
    const ownerId = requestContext?.get("ownerId");
    if (!db || !ownerId) {
      throw new Error("Database or OwnerID not found in context");
    }
    const result = await listTransactions(db, ownerId, {
      type: type ?? void 0,
      category: category ?? void 0,
      from: from ?? void 0,
      to: to ?? void 0,
      limit: limit ?? void 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    });
    return { transactions: result.items };
  }
});
const getFinancialSummaryTool = createTool({
  id: "getFinancialSummary",
  description: "Obtiene un resumen de ingresos, egresos y balance en un periodo de tiempo determinado.",
  inputSchema: z.object({
    from: z.number().describe("Unix timestamp de inicio"),
    to: z.number().describe("Unix timestamp de fin")
  }),
  execute: async ({ from, to }, { requestContext }) => {
    const db = requestContext?.get("db");
    const ownerId = requestContext?.get("ownerId");
    if (!db || !ownerId) {
      throw new Error("Database or OwnerID not found in context");
    }
    const summary = await getSummary(db, ownerId, from, to);
    return summary;
  }
});
const addTransactionTool = createTool({
  id: "addTransaction",
  description: "Registra un nuevo ingreso o egreso. \xDAsalo cuando el usuario quiera guardar un movimiento.",
  inputSchema: z.object({
    type: z.enum(["income", "expense"]),
    amountCents: z.number().int().positive().describe("Monto en centavos (ej: 1000 para 10.00 MXN)"),
    category: z.string(),
    note: z.string().optional(),
    occurredAt: z.number().optional().describe("Unix timestamp del movimiento, por defecto ahora")
  }),
  execute: async (input, { requestContext }) => {
    const db = requestContext?.get("db");
    const ownerId = requestContext?.get("ownerId");
    if (!db || !ownerId) {
      throw new Error("Database or OwnerID not found in context");
    }
    const { ulid } = await import('ulid');
    const id = ulid();
    await createTransaction(db, ownerId, {
      id,
      type: input.type,
      amountCents: input.amountCents,
      category: input.category,
      note: input.note ?? null,
      occurredAt: input.occurredAt ?? Math.floor(Date.now() / 1e3),
      source: "chat"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    });
    return { success: true, id, message: "Transacci\xF3n registrada con \xE9xito" };
  }
});

const BILLI_SYSTEM_PROMPT = `Eres Billi, un asistente financiero experto en el mercado mexicano.
Tu objetivo es ayudar a freelancers y profesionales independientes en M\xE9xico a tener claridad sobre sus finanzas.
Conoces a profundidad el SAT, el r\xE9gimen RESICO, deducciones de impuestos, y la realidad econ\xF3mica local.

Tienes acceso a las siguientes herramientas:
1. getTransactions: Para ver qu\xE9 ha gastado o ingresado el usuario.
2. getFinancialSummary: Para dar totales de ingresos, egresos y balance.
3. addTransaction: Para registrar nuevos movimientos.

Cuando el usuario te pida registrar algo como "gast\xE9 150 en comida", usa addTransaction.
Cuando te pregunte "\xBFcu\xE1nto he gastado?", usa getTransactions o getFinancialSummary.

Responde siempre en espa\xF1ol de M\xE9xico, de forma profesional, emp\xE1tica y pr\xE1ctica.
Si no sabes algo o no tienes datos suficientes, s\xE9 honesto y pide aclaraciones.
Hoy es ${(/* @__PURE__ */ new Date()).toLocaleDateString("es-MX")}.`;
const billiAgent = new Agent({
  id: "billi-agent",
  name: "Billi",
  instructions: BILLI_SYSTEM_PROMPT,
  memory: new Memory(),
  model: ({ requestContext }) => {
    const apiKey = requestContext?.get("openRouterApiKey");
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not found in request context");
    }
    const openrouter = createOpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    });
    return openrouter("anthropic/claude-3.5-sonnet");
  },
  tools: {
    getTransactions: getTransactionsTool,
    getFinancialSummary: getFinancialSummaryTool,
    addTransaction: addTransactionTool
  }
});

const mastra = new Mastra({
  storage: new LibSQLStore({
    id: "billi-storage-migration",
    url: process.env.TURSO_DATABASE_URL || "libsql://temp.db",
    authToken: process.env.TURSO_AUTH_TOKEN
  }),
  agents: {
    billiAgent
  }
});

export { addTransactionTool as a, getTransactionsTool as b, getFinancialSummaryTool as g, mastra as m };
