import { Hono } from 'hono';
import { RequestContext } from '@mastra/core/request-context';
import { getMastra } from '../mastra';
import type { Env } from '../env';
import type { DB } from '../db';

const router = new Hono<{ Bindings: Env; Variables: { userId: string; db: DB } }>();

router.get('/health', (c) => {
  return c.json({ status: 'ready', agent: 'BilliAgent' });
});

router.post('/chat', async (c) => {
  const { message, threadId } = await c.req.json<{ message: string; threadId?: string }>();
  const userId = c.get('userId');
  const db = c.get('db');
  
  if (!userId) {
    return c.json({ error: 'unauthenticated' }, 401);
  }

  const openRouterApiKey = c.env.OPENROUTER_API_KEY;
  
  if (!openRouterApiKey && c.env.VITEST !== 'true') {
    return c.json({ error: 'missing_api_key' }, 500);
  }

  // Set up request context for Mastra
  const requestContext = new RequestContext();
  requestContext.set('db', db);
  requestContext.set('ownerId', userId);
  requestContext.set('openRouterApiKey', openRouterApiKey || 'mock_key');

  try {
    const mastra = getMastra(c.env);
    const agent = mastra.getAgent('billiAgent');
    
    // For Mastra v1, memory property expects specific structure or just a threadId string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateOptions: any = {
      requestContext,
      memory: {
        resource: userId,
      },
    };

    if (threadId) {
      generateOptions.memory.thread = threadId;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await agent.generate(message, generateOptions as any);

    // In Mastra v1, threadId might be in different places depending on result shape
    // Extracting it safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseThreadId = threadId || (result as any).threadId || (result as any).memory?.threadId;

    return c.json({ 
      text: result.text,
      threadId: responseThreadId,
    });
  } catch (err) {
    console.error('Mastra Error:', err);
    return c.json({ error: 'ai_error', message: (err as Error).message }, 500);
  }
});

export default router;
