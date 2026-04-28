import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { RequestContext as RequestContextType } from '@mastra/core/request-context';
import { getMastra } from '../mastra';
import { rateLimit } from '../lib/rate-limit';
import { captureRequestSchema } from '../schemas/capture';
import type { Env } from '../env';
import type { DB } from '../db';

const router = new Hono<{ Bindings: Env; Variables: { userId: string; db: DB; requestId: string } }>();

// POST /api/capture
router.post('/', zValidator('json', captureRequestSchema), async (c) => {
  const userId = c.get('userId');
  const db = c.get('db');
  const { message, imageUrl } = c.req.valid('json');

  if (!userId) {
    return c.json({ error: 'unauthenticated' }, 401);
  }

  const rl = await rateLimit(c.env.AI_CHAT_RATE_LIMIT, `capture:${userId}`, {
    windowSec: 60,
    max: 10,
  });
  if (!rl.allowed) {
    return c.json({ error: 'rate_limited', resetAt: rl.resetAt }, 429);
  }

  const openRouterApiKey = c.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey && !__BILLI_TEST__) {
    return c.json({ error: 'missing_api_key' }, 500);
  }

  const { RequestContext } = await import('@mastra/core/request-context');
  const requestContext: RequestContextType = new RequestContext();
  requestContext.set('db', db);
  requestContext.set('ownerId', userId);
  requestContext.set('openRouterApiKey', openRouterApiKey || 'mock_key');
  requestContext.set('BILLI_LLM_MODEL', c.env.BILLI_LLM_MODEL ?? 'openai/gpt-4o-mini');
  requestContext.set('BILLI_VISION_MODEL', c.env.BILLI_VISION_MODEL ?? 'openai/gpt-4o-mini');

  try {
    const mastra = await getMastra(c.env);
    const workflow = mastra.getWorkflow('captureWorkflow');
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { message, imageUrl },
      requestContext,
    });

    if (result.status !== 'success') {
      const failureMessage =
        (result as { error?: { message?: string } }).error?.message ?? 'workflow failed';
      console.error('Capture workflow non-success:', result);
      return c.json({ error: 'capture_error', message: failureMessage }, 500);
    }

    const out = (result as {
      result: {
        proposal?: {
          amountCents: number;
          category: string;
          type: 'income' | 'expense';
          date: string;
          merchant?: string;
        };
        confidence: number;
        error?: string;
        lowConfidenceFields?: string[];
      };
    }).result;

    return c.json(out);
  } catch (err) {
    console.error('Capture route error:', err);
    return c.json(
      { error: 'capture_error', requestId: c.get('requestId') },
      500,
    );
  }
});

export default router;
