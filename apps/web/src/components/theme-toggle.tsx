"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full border border-transparent text-muted-foreground transition hover:border-border hover:bg-muted/80"
      onClick={toggleTheme}
      aria-label="Cambiar tema"
    >
      <Sun className={`h-5 w-5 ${theme === "dark" ? "hidden" : ""}`} />
      <Moon className={`h-5 w-5 ${theme === "dark" ? "" : "hidden"}`} />
    </Button>
  );
}
