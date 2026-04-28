import { z } from 'zod';
import { chatJSON, chatVisionJSON } from '../../lib/openrouter';

const captureOutputSchema = z.object({
  proposal: z
    .object({
      amountCents: z.number(),
      category: z.string(),
      type: z.enum(['income', 'expense']),
      date: z.string(),
      merchant: z.string().optional(),
    })
    .optional(),
  confidence: z.number(),
  error: z.string().optional(),
  lowConfidenceFields: z.array(z.string()).optional(),
});

const extractionInputSchema = z.object({
  message: z.string().optional(),
  imageUrl: z.string().optional(),
});

const workflowInputSchema = z.object({
  message: z.string().optional(),
  imageUrl: z.string().optional(),
});

const DEFAULT_LLM_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_VISION_MODEL = 'openai/gpt-4o-mini';

const ALLOWED_CATEGORIES = [
  'Comida',
  'Transporte',
  'Supermercado',
  'Servicios',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Vestimenta',
  'Hogar',
  'Tecnología',
  'Gastos Hormiga',
  'Varios',
] as const;

const GENERIC_PARSE_ERROR =
  'No pude entender los detalles de la transacción. ¿Podrías ser más específico?';
const VISION_UNREADABLE_ERROR =
  'No pudimos leer el recibo. ¿Quieres intentarlo de nuevo o capturarlo manualmente?';

// JSON Schema mirroring captureOutputSchema for OpenRouter `response_format: json_schema`.
// `strict: true` requires `additionalProperties: false` and that every property be `required`;
// optional fields are modeled by accepting `null` as a member of the type union.
const extractionLLMSchema = {
  type: 'object',
  properties: {
    amountCents: { type: ['integer', 'null'] },
    category: {
      type: ['string', 'null'],
      enum: [...ALLOWED_CATEGORIES, null],
    },
    type: { type: ['string', 'null'], enum: ['income', 'expense', null] },
    date: { type: ['string', 'null'] },
    merchant: { type: ['string', 'null'] },
    confidence: { type: 'number' },
    lowConfidenceFields: {
      type: ['array', 'null'],
      items: { type: 'string' },
    },
    error: { type: ['string', 'null'] },
  },
  required: [
    'amountCents',
    'category',
    'type',
    'date',
    'merchant',
    'confidence',
    'lowConfidenceFields',
    'error',
  ],
  additionalProperties: false,
} as const;

interface RawExtraction {
  amountCents: number | null;
  category: string | null;
  type: 'income' | 'expense' | null;
  date: string | null;
  merchant: string | null;
  confidence: number;
  lowConfidenceFields: string[] | null;
  error: string | null;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

const NL_SYSTEM_PROMPT = `Eres un parser de transacciones financieras para un usuario en México. Recibirás una frase en español sobre un gasto o ingreso y debes extraer los campos en JSON estricto.

Reglas:
- Cantidades en MXN. Acepta "$", "mxn", "pesos" indistintamente.
- "amountCents" es un entero en centavos (ej. 150 pesos => 15000).
- "category" debe ser una de: ${ALLOWED_CATEGORIES.join(', ')}. Usa "Varios" si no hay coincidencia clara.
- "type" es "expense" salvo que sea claramente ingreso (cobro, sueldo, depósito, etc.).
- "date" en formato YYYY-MM-DD. Si el usuario no la menciona, usa la fecha de hoy: ${TODAY()}.
- "merchant" sólo si el texto identifica un establecimiento explícito; si no, null.
- "confidence" entre 0 y 1: tu seguridad en la extracción completa.
- "lowConfidenceFields" lista los campos donde dudaste; null si todo está claro.
- Si el mensaje es ininteligible o no es una transacción, devuelve confidence 0 y "error": "${GENERIC_PARSE_ERROR}". En ese caso pon los demás campos en null.
- Responde sólo con el JSON pedido.`;

const VISION_SYSTEM_PROMPT = `Eres un OCR experto en recibos y tickets para un usuario en México. Lee la imagen del recibo y extrae los datos de la compra en JSON estricto.

Reglas:
- "amountCents" es el TOTAL de la compra en centavos enteros (ej. $540.50 => 54050).
- "category" debe ser una de: ${ALLOWED_CATEGORIES.join(', ')}. Usa "Varios" si no aplica.
- "type" suele ser "expense" en recibos.
- "date" en formato YYYY-MM-DD; si no es legible, usa hoy: ${TODAY()} y agrégalo a "lowConfidenceFields".
- "merchant" el nombre del comercio si es legible; null si no.
- "confidence" entre 0 y 1 según la legibilidad del recibo.
- "lowConfidenceFields" lista campos dudosos; null si la lectura fue limpia.
- Si la imagen NO es legible o no es un recibo, devuelve confidence 0 y "error": "${VISION_UNREADABLE_ERROR}". Pon los demás campos en null.
- Responde sólo con el JSON pedido.`;

function normalizeDate(date: string | null): string {
  const fallbackIso = new Date().toISOString();
  if (!date) return fallbackIso;
  // Accept either YYYY-MM-DD or full ISO. Anchor at UTC midday to avoid TZ flips.
  const ymdMatch = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const candidate = ymdMatch ? `${date}T12:00:00.000Z` : date;
  const ts = Date.parse(candidate);
  if (Number.isNaN(ts)) return fallbackIso;
  return new Date(ts).toISOString();
}

function buildResult(raw: RawExtraction): z.infer<typeof captureOutputSchema> {
  if (raw.error || raw.confidence === 0) {
    return {
      confidence: 0,
      error: raw.error ?? GENERIC_PARSE_ERROR,
    };
  }

  const amountCents =
    typeof raw.amountCents === 'number' && Number.isFinite(raw.amountCents)
      ? Math.round(raw.amountCents)
      : 0;
  const category = raw.category ?? 'Varios';
  const type: 'income' | 'expense' = raw.type ?? 'expense';
  const date = normalizeDate(raw.date);

  const proposal: NonNullable<z.infer<typeof captureOutputSchema>['proposal']> = {
    amountCents,
    category,
    type,
    date,
    ...(raw.merchant ? { merchant: raw.merchant } : {}),
  };

  const out: z.infer<typeof captureOutputSchema> = {
    proposal,
    confidence: raw.confidence,
  };
  if (raw.lowConfidenceFields && raw.lowConfidenceFields.length > 0) {
    out.lowConfidenceFields = raw.lowConfidenceFields;
  }
  return out;
}

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
