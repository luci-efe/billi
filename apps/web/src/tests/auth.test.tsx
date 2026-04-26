import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@clerk/clerk-react";

vi.mock("../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from "../lib/api-client";
import { useMe } from "../hooks/use-me";

// Mock useMe if needed, but here we test the real hook with mocked apiClient
// Actually, the previous version of this test was mocking useAuth and apiClient
// so useMe should be the real one.

describe("useMe Hook Logic", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when signed out", async () => {
    vi.mocked(useAuth).mockReturnValue({ isSignedIn: false, isLoaded: true } as any);
    
    const TestComponent = () => {
      const { data, isLoading } = useMe();
      if (isLoading) return <div>Loading</div>;
      return <div data-testid="status">{data ? "User" : "No User"}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByTestId("status").textContent).toBe("No User");
  });

  it("fetches data when signed in", async () => {
    vi.mocked(useAuth).mockReturnValue({ isSignedIn: true, isLoaded: true } as any);
    vi.mocked(apiClient.get).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ email: "test@example.com" }),
    } as any);

    const TestComponent = () => {
      const { data, isLoading } = useMe();
      if (isLoading) return <div data-testid="loading">Loading</div>;
      return <div data-testid="email">{data?.email}</div>;
    };

    render(<TestComponent />);
    
    // Wait for the mock fetch to resolve
    const emailEl = await screen.findByTestId("email");
    expect(emailEl.textContent).toBe("test@example.com");
  });
});
