import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  if (!mounted) {
    return (
      <Button
        aria-label="Cargando tema"
        className="h-8 w-8"
        disabled
        size="icon"
        type="button"
        variant="ghost"
      />
    );
  }

  return (
    <Button
      aria-label={label}
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{label}</span>
    </Button>
  );
}
