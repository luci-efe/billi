/**
 * End-to-end smoke test for the chatbot workflow against real OpenRouter +
 * Turso. Bypasses the HTTP/Clerk layer — exercises the workflow factory with a
 * minimal RequestContext. Run with:
 *   bun run --cwd apps/api scripts:smoke-chat
 *
 * Reads OPENROUTER_API_KEY / TURSO_* from process.env (load .dev.vars first
 * via `bun --env-file=apps/api/.dev.vars`).
 */
import { RequestContext } from '@mastra/core/di';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { buildChatbotWorkflow } from '../mastra/workflows/chatbot';

const PROBES = [
  { label: 'educational (RAG): SAT', message: '¿Qué es el SAT y para qué sirve?' },
  { label: 'educational (RAG): CETES', message: '¿Cómo invierto en CETES Directo?' },
  { label: 'educational (RAG): CAT', message: '¿Qué es el CAT en una tarjeta de crédito?' },
  { label: 'personal_history', message: '¿Cuánto gasté este mes?' },
  { label: 'add_transaction', message: 'Registra que gasté 200 pesos en gasolina hoy' },
];

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!apiKey || !url || !token) {
    console.error('Missing OPENROUTER_API_KEY / TURSO_* env. Source apps/api/.dev.vars first.');
    process.exit(1);
  }

  const turso = createClient({ url, authToken: token });
  const db = drizzle(turso);

  const { workflow } = await buildChatbotWorkflow();

  for (const probe of PROBES) {
    const ctx = new RequestContext();
    ctx.set('openRouterApiKey', apiKey);
    ctx.set('db', db);
    ctx.set('ownerId', 'smoke-test-user');
    ctx.set('BILLI_LLM_MODEL', 'openai/gpt-4o-mini');

    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { message: probe.message },
      requestContext: ctx,
    });

    const out = (result as { result?: unknown; status?: string }).result ?? result;
    console.log(`\n[${probe.label}] "${probe.message}"`);
    console.log(JSON.stringify(out, null, 2));
  }
}

main().catch((err) => {
  console.error('Smoke failed:', err);
  process.exit(1);
});
