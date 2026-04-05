// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { PortfolioProvider } from "@/src/features/portfolio/model/portfolio-context";
import { WatchlistProvider } from "@/src/features/watchlist/model/watchlist-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PortfolioProvider>
        <WatchlistProvider>{children}</WatchlistProvider>
      </PortfolioProvider>
    </ThemeProvider>
  );
}
