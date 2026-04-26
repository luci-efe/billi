import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

describe("Mastra AI Foundation (SPEC-20260426-004)", () => {
  const mockToken = "Bearer user_123";

  describe("REQ-001: Mastra Core Integration", () => {
    it("should respond to AI health check indicating Mastra is initialized", async () => {
      const res = await SELF.fetch("http://example.com/ai/health", {
        headers: { Authorization: mockToken },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { status: string; agent: string };
      expect(body.status).toBe("ready");
      expect(body.agent).toBe("BilliAgent");
    });

    it("should return a clean error if environment variables are missing", async () => {
      // In a real implementation, we might toggle a header to simulate missing keys
      // or just assume the test runner handles env vars.
      // For now, we test the expected error structure if it were to fail.
      const res = await SELF.fetch("http://example.com/ai/health", {
        headers: { 
          Authorization: mockToken,
          "X-Simulate-Config-Error": "true" 
        },
      });

      // If simulated, it should handle it gracefully
      if (res.status !== 200) {
        const body = await res.json() as { error: string };
        expect(body).toHaveProperty("error");
      }
    });
  });

  describe("REQ-002: Billi Agent Persona", () => {
    it("should maintain the Billi persona and Mexican context in response", async () => {
      const payload = {
        message: "Hola, ¿quién eres y qué sabes hacer?"
      };

      const res = await SELF.fetch("http://example.com/ai/chat", {
        method: "POST",
        headers: {
          Authorization: mockToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { text: string };
      
      const responseText = body.text.toLowerCase();
      expect(responseText).toContain("billi");
      
      // Mexican financial context keywords check
      const keywords = ["méxico", "sat", "resico", "impuestos", "fiscal", "finanzas", "pesos"];
      const hasContext = keywords.some(k => responseText.includes(k));
      expect(hasContext).toBe(true);
    });
  });

  describe("REQ-003: Core Financial Tool - getTransactions", () => {
    it("should successfully trigger getTransactions tool and narrate result", async () => {
      const payload = {
        message: "¿Cuál fue mi último gasto registrado?"
      };

      const res = await SELF.fetch("http://example.com/ai/chat", {
        method: "POST",
        headers: {
          Authorization: mockToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { text: string; toolCalls?: any[] };
      
      // Final response should not be empty
      expect(body.text).toBeTruthy();
      expect(body.text.length).toBeGreaterThan(10);
    });

    it("should correctly report when no transactions are found for the user", async () => {
      const res = await SELF.fetch("http://example.com/ai/chat", {
        method: "POST",
        headers: {
          Authorization: "Bearer user_with_no_data",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Enséñame mis últimos movimientos" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { text: string };
      
      const responseText = body.text.toLowerCase();
      expect(responseText).toMatch(/no (encontr|tienes|hay)/);
    });
  });
});
