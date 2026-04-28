import { z } from 'zod';
import * as repo from '@billi/db/repos/transactions';
import { retrieveTopK } from '@billi/db/repos/rag';
import type { DB } from '../../db';
import { embedText } from '../../lib/openrouter';

const getTransactionsInput = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().optional(),
  from: z.number().optional().describe('Unix timestamp de inicio'),
  to: z.number().optional().describe('Unix timestamp de fin'),
  limit: z.number().optional().default(10),
});

const getFinancialSummaryInput = z.object({
  from: z.number().describe('Unix timestamp de inicio'),
  to: z.number().describe('Unix timestamp de fin'),
});

// SEC-11: never trust the caller's `source`/`sourceRef`. The chat agent path
// always tags writes as `source: 'chat'`. Capture flow uses its own writer.
const addTransactionInput = z.object({
  type: z.enum(['income', 'expense']),
  amountCents: z.number().int().positive().describe('Monto en centavos (ej: 1000 para 10.00 MXN)'),
  category: z.string(),
  note: z.string().optional(),
  occurredAt: z.number().optional().describe('Unix timestamp del movimiento, por defecto ahora'),
});

const searchKnowledgeBaseInput = z.object({
  query: z.string().min(1).describe('Pregunta del usuario para buscar en la base de conocimientos'),
  k: z.number().int().positive().max(20).optional().default(5),
});

/**
 * Lazy factory for the Billi tools. Must be called inside the request path —
 * `createTool` from `@mastra/core/tools` may invoke `crypto.randomUUID()`
 * during module init, which is forbidden in Cloudflare Workers global scope.
 */
export async function buildBilliTools() {
  const { createTool } = await import('@mastra/core/tools');

  const getTransactionsTool = createTool({
    id: 'getTransactions',
    description: 'Consulta el historial de transacciones del usuario. Puede filtrar por fechas, tipo (ingreso/egreso) o categoría.',
    inputSchema: getTransactionsInput,
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

  const getFinancialSummaryTool = createTool({
    id: 'getFinancialSummary',
    description: 'Obtiene un resumen de ingresos, egresos y balance en un periodo de tiempo determinado.',
    inputSchema: getFinancialSummaryInput,
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

  const addTransactionTool = createTool({
    id: 'addTransaction',
    description: 'Registra un nuevo ingreso o egreso. Úsalo cuando el usuario quiera guardar un movimiento.',
    inputSchema: addTransactionInput,
    execute: async (input, { requestContext }) => {
      const db = requestContext?.get('db') as DB;
      const ownerId = requestContext?.get('ownerId') as string;

      if (!db || !ownerId) {
        throw new Error('Database or OwnerID not found in context');
      }

      const { ulid } = await import('ulid');
      const id = ulid();

      // SEC-11: source is always pinned to 'chat' here; callers cannot
      // override it via the tool input.
      await repo.createTransaction(db, ownerId, {
        id,
        type: input.type,
        amountCents: input.amountCents,
        category: input.category,
        note: input.note ?? null,
        occurredAt: input.occurredAt ?? Math.floor(Date.now() / 1000),
        source: 'chat',
        sourceRef: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      return { success: true, id, message: 'Transacción registrada con éxito' };
    },
  });

  const searchKnowledgeBaseTool = createTool({
    id: 'searchKnowledgeBase',
    description:
      'Busca pasajes relevantes en la base de conocimientos fiscal y financiera de Billi (SAT, RESICO, deducciones, etc.).',
    inputSchema: searchKnowledgeBaseInput,
    execute: async ({ query, k }, { requestContext }) => {
      const db = requestContext?.get('db') as DB;
      const apiKey = requestContext?.get('openRouterApiKey') as string | undefined;

      if (!db) {
        throw new Error('Database not found in context');
      }
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not found in context');
      }

      const embedding = await embedText(query, { apiKey });
      const chunks = await retrieveTopK(db, embedding, k ?? 5);

      return {
        chunks: chunks.map((c) => ({
          id: c.id,
          topic: c.topic,
          content: c.content,
          metadata: c.metadata,
        })),
      };
    },
  });

  return {
    getTransactionsTool,
    getFinancialSummaryTool,
    addTransactionTool,
    searchKnowledgeBaseTool,
  };
}
