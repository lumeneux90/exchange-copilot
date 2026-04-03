"use client";

import * as React from "react";
import { RiMoonClearLine, RiSunLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isLightTheme = mounted ? theme === "light" : false;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isLightTheme ? "dark" : "light")}
    >
      {isLightTheme ? (
        <RiMoonClearLine aria-hidden="true" />
      ) : (
        <RiSunLine aria-hidden="true" />
      )}
    </Button>
  );
}
