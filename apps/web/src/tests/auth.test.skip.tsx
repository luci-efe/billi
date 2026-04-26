import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@clerk/clerk-react";
import { apiClient } from "../lib/api-client";
import { useMe } from "../hooks/use-me";
import React from 'react';

// Mock useAuth and useUser if needed, but here we test the real hook with mocked apiClient
vi.mock("@clerk/clerk-react", () => ({
  useAuth: vi.fn(),
  useUser: vi.fn(),
  useClerk: vi.fn(),
  SignedIn: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-signed-in">{children}</div>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-signed-out">{children}</div>,
}));

vi.mock("../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("useMe Hook Logic", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when signed out", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({ isSignedIn: false, isLoaded: true });
    
    const TestComponent = () => {
      const { data, isLoading } = useMe();
      if (isLoading) return <div>Loading</div>;
      return <div data-testid="status">{data ? "User" : "No User"}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByTestId("status").textContent).toBe("No User");
  });

  it("fetches data when signed in", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({ isSignedIn: true, isLoaded: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (apiClient.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ email: "test@example.com" }),
    });

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
