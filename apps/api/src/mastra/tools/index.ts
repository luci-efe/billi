import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as repo from '@billi/db/repos/transactions';
import type { DB } from '../../db';

export const getTransactionsTool = createTool({
  id: 'getTransactions',
  description: 'Consulta el historial de transacciones del usuario. Puede filtrar por fechas, tipo (ingreso/egreso) o categoría.',
  inputSchema: z.object({
    type: z.enum(['income', 'expense']).optional(),
    category: z.string().optional(),
    from: z.number().optional().describe('Unix timestamp de inicio'),
    to: z.number().optional().describe('Unix timestamp de fin'),
    limit: z.number().optional().default(10),
  }),
  execute: async ({ type, category, from, to, limit }, { requestContext }) => {
    const db = requestContext?.get('db') as DB;
    const ownerId = requestContext?.get('ownerId') as string;

    if (!db || !ownerId) {
      throw new Error('Database or OwnerID not found in context');
    }

    const result = await repo.listTransactions(db, ownerId, {
      type: type ?? undefined,
      category: category ?? undefined,
      from: from ?? undefined,
      to: to ?? undefined,
      limit: limit ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return { transactions: result.items };
  },
});

export const getFinancialSummaryTool = createTool({
  id: 'getFinancialSummary',
  description: 'Obtiene un resumen de ingresos, egresos y balance en un periodo de tiempo determinado.',
  inputSchema: z.object({
    from: z.number().describe('Unix timestamp de inicio'),
    to: z.number().describe('Unix timestamp de fin'),
  }),
  execute: async ({ from, to }, { requestContext }) => {
    const db = requestContext?.get('db') as DB;
    const ownerId = requestContext?.get('ownerId') as string;

    if (!db || !ownerId) {
      throw new Error('Database or OwnerID not found in context');
    }

    const summary = await repo.getSummary(db, ownerId, from, to);
    return summary;
  },
});

export const addTransactionTool = createTool({
  id: 'addTransaction',
  description: 'Registra un nuevo ingreso o egreso. Úsalo cuando el usuario quiera guardar un movimiento.',
  inputSchema: z.object({
    type: z.enum(['income', 'expense']),
    amountCents: z.number().int().positive().describe('Monto en centavos (ej: 1000 para 10.00 MXN)'),
    category: z.string(),
    note: z.string().optional(),
    occurredAt: z.number().optional().describe('Unix timestamp del movimiento, por defecto ahora'),
    source: z.enum(['form', 'text', 'voice', 'image', 'chat']).optional().default('chat'),
    sourceRef: z.string().optional(),
  }),
  execute: async (input, { requestContext }) => {
    const db = requestContext?.get('db') as DB;
    const ownerId = requestContext?.get('ownerId') as string;

    if (!db || !ownerId) {
      throw new Error('Database or OwnerID not found in context');
    }

    const { ulid } = await import('ulid');
    const id = ulid();

    await repo.createTransaction(db, ownerId, {
      id,
      type: input.type,
      amountCents: input.amountCents,
      category: input.category,
      note: input.note ?? null,
      occurredAt: input.occurredAt ?? Math.floor(Date.now() / 1000),
      source: input.source,
      sourceRef: input.sourceRef ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return { success: true, id, message: 'Transacción registrada con éxito' };
  },
});
