"use client";

import * as React from "react";

type WatchlistContextValue = {
  isInWatchlist: (ticker: string) => boolean;
  isLimitReached: boolean;
  tickers: string[];
  toggleTicker: (ticker: string) => void;
};

const STORAGE_KEY = "xchange-copilot-watchlist";
const MAX_WATCHLIST_ITEMS = 5;

const WatchlistContext = React.createContext<WatchlistContextValue | null>(null);

function parseStoredWatchlist(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, MAX_WATCHLIST_ITEMS);
  } catch {
    return [];
  }
}

export function WatchlistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tickers, setTickers] = React.useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    setTickers(parseStoredWatchlist(window.localStorage.getItem(STORAGE_KEY)));
    setHasLoaded(true);
  }, []);

  React.useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
  }, [hasLoaded, tickers]);

  const toggleTicker = React.useCallback((ticker: string) => {
    const normalizedTicker = ticker.trim().toUpperCase();

    if (!normalizedTicker) {
      return;
    }

    setTickers((currentTickers) =>
      currentTickers.includes(normalizedTicker)
        ? currentTickers.filter((item) => item !== normalizedTicker)
        : currentTickers.length >= MAX_WATCHLIST_ITEMS
          ? currentTickers
          : [...currentTickers, normalizedTicker]
    );
  }, []);

  const isInWatchlist = React.useCallback(
    (ticker: string) => tickers.includes(ticker.trim().toUpperCase()),
    [tickers]
  );

  const value = React.useMemo(
    () => ({
      isInWatchlist,
      isLimitReached: tickers.length >= MAX_WATCHLIST_ITEMS,
      tickers,
      toggleTicker,
    }),
    [isInWatchlist, tickers, toggleTicker]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = React.useContext(WatchlistContext);

  if (!context) {
    throw new Error("useWatchlist must be used within a WatchlistProvider.");
  }

  return context;
}
