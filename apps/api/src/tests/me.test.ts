import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

describe("Backend Auth & /api/me", () => {
  it("W-01: GET /api/me without auth returns 401", async () => {
    const res = await SELF.fetch("http://example.com/api/me");
    expect(res.status).toBe(401);
  });

  it("W-02: GET /api/me with valid JWT upserts users row", async () => {
    // This will likely fail with 401 because we haven't mocked Clerk
    const res = await SELF.fetch("http://example.com/api/me", {
      headers: {
        Authorization: "Bearer mock-token",
      },
    });
    
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body).toHaveProperty("userId");
    expect(body).toHaveProperty("email");
  });

  it("W-03: Second GET /api/me is a no-op upsert", async () => {
    const res1 = await SELF.fetch("http://example.com/api/me", {
      headers: { Authorization: "Bearer mock-token" }
    });
    expect(res1.status).toBe(200);

    const res2 = await SELF.fetch("http://example.com/api/me", {
      headers: { Authorization: "Bearer mock-token" }
    });
    expect(res2.status).toBe(200);
  });

  it("W-04: POST /api/me/consent updates users.consent_v", async () => {
    const res = await SELF.fetch("http://example.com/api/me/consent", {
      method: "POST",
      headers: {
        Authorization: "Bearer mock-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: 1,
        acceptedAt: 1713912345,
      }),
    });

    expect(res.status).toBe(204);
  });
});
