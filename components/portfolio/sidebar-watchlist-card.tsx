"use client";

import Link from "next/link";

import { CompanyLogo } from "@/components/company-logo";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { useWatchlist } from "@/src/features/watchlist/model/watchlist-context";
import type { Stock } from "@/src/entities/stock/model/types";
import { formatSignedPercent } from "@/src/lib/money";
import { cn } from "@/src/lib/utils";

function getTrendTone(value: number) {
  if (value > 0) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (value < 0) {
    return "text-red-600 dark:text-red-400";
  }

  return "text-muted-foreground";
}

export function SidebarWatchlistCard({ stocks }: { stocks: Stock[] }) {
  const { tickers } = useWatchlist();

  const watchlistStocks = tickers
    .map((ticker) => stocks.find((stock) => stock.ticker === ticker))
    .filter((stock): stock is Stock => Boolean(stock));

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Watchlist</SidebarGroupLabel>
      <SidebarGroupContent>
        {watchlistStocks.length > 0 ? (
          <div className="grid gap-2">
            {watchlistStocks.map((stock) => (
              <Link
                key={stock.ticker}
                href={`/?ticker=${stock.ticker}`}
                className="bg-sidebar-accent/30 hover:bg-sidebar-accent flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CompanyLogo
                    ticker={stock.ticker}
                    name={stock.name}
                    className="size-8 rounded-lg"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{stock.ticker}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {stock.name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {stock.price.toFixed(2)}
                  </div>
                  <div
                    className={cn(
                      "text-xs font-medium",
                      getTrendTone(stock.changePercent)
                    )}
                  >
                    {formatSignedPercent(stock.changePercent)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-xs">
            Добавляйте компании в Watchlist по кнопке Избранное.
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
