"use client";

import { RiMoonClearLine, RiSunLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="Toggle color theme"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? (
        <RiMoonClearLine aria-hidden="true" />
      ) : (
        <RiSunLine aria-hidden="true" />
      )}
    </Button>
  );
}
