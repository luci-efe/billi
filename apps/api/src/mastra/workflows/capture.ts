import { z } from 'zod';
import { chatJSON, chatVisionJSON } from '../../lib/openrouter';
import {
  captureOutputSchema,
  extractionLLMSchema,
  NL_SYSTEM_PROMPT,
  VISION_SYSTEM_PROMPT,
  GENERIC_PARSE_ERROR,
  VISION_UNREADABLE_ERROR,
  DEFAULT_LLM_MODEL,
  DEFAULT_VISION_MODEL,
  buildResult,
  type RawExtraction,
} from './capture-shared';

const extractionInputSchema = z.object({
  message: z.string().optional(),
  imageUrl: z.string().optional(),
});
const workflowInputSchema = extractionInputSchema;

/**
 * Lazy factory for the capture workflow. Must be called inside the request path —
 * `createWorkflow` / `createStep` from `@mastra/core/workflows` invokes
 * `crypto.randomUUID()` during module init, which is forbidden in Cloudflare
 * Workers global scope.
 */
export async function buildCaptureWorkflow() {
  const { createWorkflow, createStep } = await import('@mastra/core/workflows');

  const extractionStep = createStep({
    id: 'extraction',
    inputSchema: extractionInputSchema,
    outputSchema: captureOutputSchema,
    execute: async ({ inputData, requestContext }) => {
      const { message, imageUrl } = inputData;

      const apiKey = requestContext?.get('openRouterApiKey') as string | undefined;
      const llmModel =
        (requestContext?.get('BILLI_LLM_MODEL') as string | undefined) ?? DEFAULT_LLM_MODEL;
      const visionModel =
        (requestContext?.get('BILLI_VISION_MODEL') as string | undefined) ?? DEFAULT_VISION_MODEL;

      if (!apiKey || apiKey === 'mock_key') {
        // Without a real key we cannot run the extractor. The route layer
        // already gates this path in non-test mode; surface a soft failure.
        return {
          confidence: 0,
          error: GENERIC_PARSE_ERROR,
        };
      }

      try {
        let raw: RawExtraction;
        if (imageUrl) {
          raw = await chatVisionJSON<RawExtraction>({
            apiKey,
            model: visionModel,
            system: VISION_SYSTEM_PROMPT,
            imageUrl,
            schema: { name: 'capture_extraction', schema: extractionLLMSchema },
          });
        } else if (message) {
          raw = await chatJSON<RawExtraction>({
            apiKey,
            model: llmModel,
            system: NL_SYSTEM_PROMPT,
            user: `<usuario>${message}</usuario>`,
            schema: { name: 'capture_extraction', schema: extractionLLMSchema },
          });
        } else {
          return { confidence: 0, error: GENERIC_PARSE_ERROR };
        }
        return buildResult(raw);
      } catch (err) {
        console.error('captureWorkflow extraction error:', err);
        return {
          confidence: 0,
          error: imageUrl ? VISION_UNREADABLE_ERROR : GENERIC_PARSE_ERROR,
        };
      }
    },
  });

  const workflow = createWorkflow({
    id: 'capture-workflow',
    inputSchema: workflowInputSchema,
    outputSchema: captureOutputSchema,
  })
    .then(extractionStep)
    .commit();

  // Wrap — see chatbot.ts: Workflow has `.then()` so bare instances are
  // thenable and would be auto-awaited if returned from an async function.
  return { workflow };
}
