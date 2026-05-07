import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    document.documentElement.className = "";
    localStorage.clear();
  });

  it("defaults the app to dark mode and lets the user switch to light mode", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cambiar a tema claro" })).toBeInTheDocument();
      expect(document.documentElement).toHaveClass("dark");
    });

    await user.click(screen.getByRole("button", { name: "Cambiar a tema claro" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cambiar a tema oscuro" })).toBeInTheDocument();
      expect(document.documentElement).toHaveClass("light");
      expect(document.documentElement).not.toHaveClass("dark");
      expect(localStorage.getItem("theme")).toBe("light");
    });
  });
});
