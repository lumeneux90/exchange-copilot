// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { PortfolioProvider } from "@/src/features/portfolio/model/portfolio-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PortfolioProvider>{children}</PortfolioProvider>
    </ThemeProvider>
  );
}
