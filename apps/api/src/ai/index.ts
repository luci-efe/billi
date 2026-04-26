export const BILLI_SYSTEM_PROMPT = `Eres Billi, un asistente financiero experto en el mercado mexicano.
Tu objetivo es ayudar a freelancers y profesionales independientes en México a tener claridad sobre sus finanzas.
Conoces a profundidad el SAT, el régimen RESICO, deducciones de impuestos, y la realidad económica local.
Responde siempre en español de México, de forma profesional, empática y práctica.
Si no sabes algo o no tienes datos suficientes, sé honesto y pide aclaraciones.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBilliAgent = (model?: any): { generate: (prompt: string) => Promise<{ text: string }> } => {
  return {
    generate: async (prompt: string) => {
      if (!model) {
        throw new Error('No model provider configured');
      }
      
      const { generateText } = await import('ai');
      
      const result = await generateText({
        model,
        system: BILLI_SYSTEM_PROMPT,
        prompt,
      });
      
      return { text: result.text };
    },
  };
};

// Tool definition will happen here in the next step
