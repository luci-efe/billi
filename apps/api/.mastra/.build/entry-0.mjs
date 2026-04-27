import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createOpenAI } from '@ai-sdk/openai';
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

"use strict";
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

"use strict";
function getMastra(env) {
  const storage = new LibSQLStore({
    id: "billi-storage",
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN
  });
  return new Mastra({
    storage,
    agents: {
      billiAgent
    }
  });
}
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

async function runMigration() {
      const storage = mastra.getStorage();

      if (!storage) {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: 'Storage not configured. Please configure storage in your Mastra instance.',
        }));
        process.exit(1);
      }

      // Access the observability store directly from storage.stores
      const observabilityStore = storage.stores?.observability;

      if (!observabilityStore) {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: 'Observability storage not configured. Migration not required.',
        }));
        process.exit(0);
      }

      // Check if the store has a migrateSpans method
      if (typeof observabilityStore.migrateSpans !== 'function') {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: 'Migration not supported for this storage backend.',
        }));
        process.exit(1);
      }

      try {
        // Run the migration - migrateSpans handles everything internally
        const result = await observabilityStore.migrateSpans();

        console.log(JSON.stringify({
          success: result.success,
          alreadyMigrated: result.alreadyMigrated,
          duplicatesRemoved: result.duplicatesRemoved,
          message: result.message,
        }));

        process.exit(result.success ? 0 : 1);
      } catch (error) {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: error instanceof Error ? error.message : 'Unknown error during migration',
        }));
        process.exit(1);
      }
    }

    runMigration();
