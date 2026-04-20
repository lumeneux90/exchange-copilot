// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { PortfolioProvider } from "@/src/features/portfolio/model/portfolio-context";
import { PasscodeGate } from "@/src/features/passcode/ui/passcode-gate";
import type { PortfolioState } from "@/src/features/portfolio/model/types";
import { WatchlistProvider } from "@/src/features/watchlist/model/watchlist-context";

export function Providers({
  children,
  currentUser,
  initialPortfolio,
}: {
  children: React.ReactNode;
  currentUser: {
    id: string;
    login: string;
  } | null;
  initialPortfolio?: PortfolioState | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PasscodeGate currentUser={currentUser}>
        <PortfolioProvider initialPortfolio={initialPortfolio}>
          <WatchlistProvider>{children}</WatchlistProvider>
        </PortfolioProvider>
      </PasscodeGate>
    </ThemeProvider>
  );
}
