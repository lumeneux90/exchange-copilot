"use client";

import { useRouter } from "next/navigation";

import { CurrencyFlag } from "@/components/currency-flag";
import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import { getCurrencyLabel } from "@/src/entities/market/model/currencies";
import { rubFormatter } from "@/src/lib/money";
import { cn } from "@/src/lib/utils";

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function getTrendTone(value: number) {
  if (value > 0) {
    return "text-chart-2";
  }

  if (value < 0) {
    return "text-destructive";
  }

  return "text-muted-foreground";
}

export function FxTradePanel({
  currencyRates,
  className,
}: {
  currencyRates: CurrencyRate[];
  className?: string;
}) {
  const router = useRouter();

  return (
    <div className={cn("grid gap-2 xl:grid-cols-2", className)}>
      {currencyRates.slice(0, 6).map((item) => {
        const directionClass = getTrendTone(item.changePercent);

        return (
          <button
            key={item.code}
            type="button"
            className="hover:bg-accent/40 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors"
            onClick={() => router.push(`/chart?fx=${item.code}`)}
          >
            <div className="flex min-w-0 items-center gap-3">
              <CurrencyFlag code={item.code} className="size-8 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {item.label}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {getCurrencyLabel(item.code)}
                </div>
              </div>
            </div>
            <div className="min-w-fit pl-2 text-right">
              <div className="text-sm font-medium tabular-nums">
                {rubFormatter.format(item.price)}
              </div>
              <div
                className={cn(
                  "text-xs font-medium tabular-nums",
                  directionClass
                )}
              >
                {formatPercent(item.changePercent)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
