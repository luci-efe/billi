import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createOpenAI } from '@ai-sdk/openai';
import { getTransactionsTool, getFinancialSummaryTool, addTransactionTool } from '../tools';

export const BILLI_SYSTEM_PROMPT = `Eres Billi, un asistente financiero experto en el mercado mexicano.
Tu objetivo es ayudar a freelancers y profesionales independientes en México a tener claridad sobre sus finanzas.
Conoces a profundidad el SAT, el régimen RESICO, deducciones de impuestos, y la realidad económica local.

Tienes acceso a las siguientes herramientas:
1. getTransactions: Para ver qué ha gastado o ingresado el usuario.
2. getFinancialSummary: Para dar totales de ingresos, egresos y balance.
3. addTransaction: Para registrar nuevos movimientos.

Cuando el usuario te pida registrar algo como "gasté 150 en comida", usa addTransaction.
Cuando te pregunte "¿cuánto he gastado?", usa getTransactions o getFinancialSummary.

Responde siempre en español de México, de forma profesional, empática y práctica.
Si no sabes algo o no tienes datos suficientes, sé honesto y pide aclaraciones.
Hoy es ${new Date().toLocaleDateString('es-MX')}.`;

export const billiAgent = new Agent({
  id: 'billi-agent',
  name: 'Billi',
  instructions: BILLI_SYSTEM_PROMPT,
  memory: new Memory(),
  model: ({ requestContext }) => {
    const apiKey = requestContext?.get('openRouterApiKey') as string;
    
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not found in request context');
    }

    const openrouter = createOpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    return openrouter('inception/mercury-2');
  },
  tools: {
    getTransactions: getTransactionsTool,
    getFinancialSummary: getFinancialSummaryTool,
    addTransaction: addTransactionTool,
  },
});
