// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { PortfolioProvider } from "@/src/features/portfolio/model/portfolio-context";
import type { PortfolioState } from "@/src/features/portfolio/model/types";
import { WatchlistProvider } from "@/src/features/watchlist/model/watchlist-context";

export function Providers({
  children,
  initialPortfolio,
}: {
  children: React.ReactNode;
  initialPortfolio?: PortfolioState | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PortfolioProvider initialPortfolio={initialPortfolio}>
        <WatchlistProvider>{children}</WatchlistProvider>
      </PortfolioProvider>
    </ThemeProvider>
  );
}
