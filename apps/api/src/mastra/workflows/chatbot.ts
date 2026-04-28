import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

const FALLBACK_MESSAGE = "I couldn't find specific information in my knowledge base. Would you like to ask about something else?";

const guardrailStep = createStep({
  id: 'guardrail',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    passed: z.boolean(),
    reason: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { message } = inputData;
    // Simple mock guardrail
    if (message.includes('Ignore previous instructions')) {
      return {
        passed: false,
        reason: "Security violation: potential prompt injection.",
      };
    }
    return { passed: true };
  },
});

const classifyStep = createStep({
  id: 'classify',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    intent: z.enum(['educational', 'personal_history', 'general', 'ambiguous']),
  }),
  execute: async ({ inputData, setState }) => {
    const { message } = inputData;
    let intent: 'educational' | 'personal_history' | 'general' | 'ambiguous' = 'general';

    if (message.toLowerCase().includes('sat') || message.toLowerCase().includes('resico')) {
      intent = 'educational';
    } else if (message.toLowerCase().includes('spend') || message.toLowerCase().includes('transaction') || message.toLowerCase().includes('user')) {
      intent = 'personal_history';
    } else if (message.toLowerCase().includes('taxes')) {
      intent = 'ambiguous';
    }

    setState({ intent });
    return { intent };
  },
});

const ragStep = createStep({
  id: 'rag',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    text: z.string().optional(),
    sources: z.array(z.string()).optional(),
    found: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { message } = inputData;
    
    // Simulate retrieval logic
    if (message.toLowerCase().includes('resico')) {
      return {
        text: "RESICO (Régimen Simplificado de Confianza) es un esquema del SAT [1].",
        sources: ["Ley del ISR - Art. 113"],
        found: true,
      };
    }
    
    return {
      found: false,
    };
  },
});

const historyStep = createStep({
  id: 'history',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { message } = inputData;
    if (message.includes('user 5') || message.includes('someone else')) {
      return { text: "I cannot access other users' data." };
    }
    return {
      text: "Your total spending today was $450.00",
    };
  },
});

const finalStep = createStep({
  id: 'final',
  inputSchema: z.object({
    guardrail: z.object({
      passed: z.boolean(),
      reason: z.string().optional(),
    }).nullable().optional(),
    rag: z.object({
      text: z.string().optional(),
      sources: z.array(z.string()).optional(),
      found: z.boolean(),
    }).nullable().optional(),
    history: z.object({
      text: z.string(),
    }).nullable().optional(),
  }),
  outputSchema: z.object({
    intent: z.string(),
    text: z.string(),
    sources: z.array(z.string()).optional(),
  }),
  execute: async ({ state, inputData }) => {
    if (inputData.guardrail && !inputData.guardrail.passed) {
      return {
        intent: 'security_violation',
        text: inputData.guardrail.reason || "Security violation",
      };
    }

    const intent = (state as any).intent || 'unknown';
    
    if (intent === 'educational') {
      if (inputData.rag?.found && inputData.rag.text) {
        return {
          intent,
          text: inputData.rag.text,
          sources: inputData.rag.sources,
        };
      }
      return {
        intent,
        text: FALLBACK_MESSAGE,
      };
    }

    if (intent === 'personal_history' && inputData.history) {
      return {
        intent,
        text: inputData.history.text,
      };
    }

    if (intent === 'ambiguous') {
        return {
            intent,
            text: "Do you mean general tax rules or your specific tax history?",
        }
    }
    
    return {
      intent,
      text: "I'm not sure how to help with that yet.",
    };
  },
});

export const chatbotWorkflow = createWorkflow({
  id: 'chatbot-workflow',
  inputSchema: z.object({
    message: z.string(),
  }),
})
  .then(guardrailStep)
  .map(async ({ getInitData }) => {
    return {
      message: getInitData().message,
    };
  })
  .then(classifyStep)
  .map(async ({ inputData, getInitData }) => {
    return {
      intent: inputData.intent,
      message: getInitData().message,
    };
  })
  .branch([
    [
      async ({ inputData }) => inputData.intent === 'educational',
      ragStep
    ],
    [
      async ({ inputData }) => inputData.intent === 'personal_history',
      historyStep
    ],
  ])
  .map(async ({ getStepResult }) => {
    return {
      guardrail: getStepResult('guardrail'),
      rag: getStepResult('rag'),
      history: getStepResult('history'),
    };
  })
  .then(finalStep)
  .commit();
