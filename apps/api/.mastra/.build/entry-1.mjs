import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as repo from '@billi/db/repos/transactions';

"use strict";
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
    const result = await repo.listTransactions(db, ownerId, {
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
    const summary = await repo.getSummary(db, ownerId, from, to);
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
    await repo.createTransaction(db, ownerId, {
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

export { addTransactionTool, getFinancialSummaryTool, getTransactionsTool };
