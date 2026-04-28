import { Hono } from 'hono';
import { z } from 'zod';
import type { RequestContext as RequestContextType } from '@mastra/core/request-context';
import { getMastra } from '../mastra';
import { rateLimit } from '../lib/rate-limit';
import type { Env } from '../env';
import type { DB } from '../db';

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  threadId: z.string().optional(),
});

const router = new Hono<{ Bindings: Env; Variables: { userId: string; db: DB; requestId: string } }>();

router.get('/health', (c) => {
  return c.json({ status: 'ready', agent: 'BilliAgent' });
});

router.post('/chat', async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json', message: 'El cuerpo de la solicitud no es JSON v\u00e1lido.' }, 400);
  }
  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const reason = issue?.code === 'too_big'
      ? 'El mensaje supera el l\u00edmite de 2000 caracteres.'
      : issue?.code === 'too_small'
        ? 'El mensaje no puede estar vac\u00edo.'
        : 'Solicitud inv\u00e1lida.';
    return c.json({ error: 'invalid_request', message: reason }, 400);
  }
  const { message } = parsed.data;
  const userId = c.get('userId');
  const db = c.get('db');

  if (!userId) {
    return c.json({ error: 'unauthenticated' }, 401);
  }

  const rl = await rateLimit(c.env.AI_CHAT_RATE_LIMIT, `ai:${userId}`, {
    windowSec: 60,
    max: 30,
  });
  if (!rl.allowed) {
    return c.json({ error: 'rate_limited', resetAt: rl.resetAt }, 429);
  }

  const openRouterApiKey = c.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey && !__BILLI_TEST__) {
    return c.json({ error: 'missing_api_key' }, 500);
  }

  // Set up request context for the workflow + any inner agent steps.
  const { RequestContext } = await import('@mastra/core/request-context');
  const requestContext: RequestContextType = new RequestContext();
  requestContext.set('db', db);
  requestContext.set('ownerId', userId);
  requestContext.set('openRouterApiKey', openRouterApiKey || 'mock_key');
  requestContext.set('BILLI_LLM_MODEL', c.env.BILLI_LLM_MODEL ?? 'openai/gpt-4o-mini');
  requestContext.set('BILLI_VISION_MODEL', c.env.BILLI_VISION_MODEL ?? 'openai/gpt-4o-mini');

  try {
    const mastra = await getMastra(c.env);
    const workflow = mastra.getWorkflow('chatbotWorkflow');
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { message },
      requestContext,
    });

    if (result.status !== 'success') {
      const message = (result as { error?: { message?: string } }).error?.message ?? 'workflow failed';
      console.error('Workflow non-success:', result);
      return c.json({ error: 'ai_error', message }, 500);
    }

    const out = (result as { result: { intent: string; text: string; sources?: string[] } }).result;

    return c.json({
      text: out.text,
      intent: out.intent,
      sources: out.sources,
      threadId: null,
    });
  } catch (err) {
    console.error('Mastra Error:', err);
    return c.json({ error: 'ai_error', requestId: c.get('requestId') }, 500);
  }
});

export default router;
