// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { CurrentUserProvider } from "@/src/features/auth/model/current-user-context";
import { PortfolioProvider } from "@/src/features/portfolio/model/portfolio-context";
import { PasscodeGate } from "@/src/features/passcode/ui/passcode-gate";
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
      <PasscodeGate currentUser={currentUser}>
        <CurrentUserProvider currentUser={currentUser}>
          <PortfolioProvider currentUser={currentUser}>
            <WatchlistProvider>{children}</WatchlistProvider>
          </PortfolioProvider>
        </CurrentUserProvider>
      </PasscodeGate>
    </ThemeProvider>
  );
}
