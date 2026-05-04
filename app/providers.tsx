// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { CurrentUserProvider } from "@/src/features/auth/model/current-user-context";
import { FinanceProvider } from "@/src/features/finance/model/finance-context";
import { PortfolioProvider } from "@/src/features/portfolio/model/portfolio-context";
import { WatchlistProvider } from "@/src/features/watchlist/model/watchlist-context";

export function Providers({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: {
    id: string;
    login: string;
  } | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <CurrentUserProvider currentUser={currentUser}>
        <PortfolioProvider currentUser={currentUser}>
          <FinanceProvider currentUser={currentUser}>
            <WatchlistProvider>{children}</WatchlistProvider>
          </FinanceProvider>
        </PortfolioProvider>
      </CurrentUserProvider>
    </ThemeProvider>
  );
}
