"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiExchangeFundsLine,
} from "@remixicon/react";

import { CompanyLogo } from "@/components/company-logo";
import { FxTradePanel } from "@/components/portfolio/fx-trade-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import type { Stock } from "@/src/entities/stock/model/types";
import { cn } from "@/src/lib/utils";

type MarketSummary = {
  currencyRates: CurrencyRate[];
  moexIndexChangePercent: number;
  moexIndexLabel: string;
  moexIndexValue: number;
  mostActiveStocks: Stock[];
  topGainers: Stock[];
  topLosers: Stock[];
};

type TrendDirection = "positive" | "negative" | "neutral";

const priceRubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 2,
});

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatIndexValue(value: number) {
  return value > 0 ? value.toFixed(2) : "—";
}

function formatPrice(value: number) {
  return value > 0 ? priceRubFormatter.format(value) : "—";
}

function formatTurnoverMillions(value: number) {
  if (value <= 0) {
    return "—";
  }

  const inMillions = value / 1_000_000;
  const maximumFractionDigits = inMillions >= 1_000 ? 0 : 1;

  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits,
  }).format(inMillions)} млн ₽`;
}

function getTrendDirection(value: number): TrendDirection {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "neutral";
}

function getTrendBadgeStyle(
  direction: TrendDirection
): React.CSSProperties | undefined {
  switch (direction) {
    case "positive":
      return { color: "var(--primary)" };
    case "negative":
      return { color: "var(--destructive)" };
    default:
      return undefined;
  }
}

function getTrendBadgeContent(direction: TrendDirection) {
  switch (direction) {
    case "positive":
      return {
        icon: <RiArrowUpLine />,
      };
    case "negative":
      return {
        icon: <RiArrowDownLine />,
      };
    default:
      return {
        icon: <RiExchangeFundsLine />,
      };
  }
}

function TrendBadge({
  direction,
  children,
}: {
  direction: TrendDirection;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-1 text-xs font-medium"
      style={getTrendBadgeStyle(direction)}
    >
      {children}
    </div>
  );
}

function TrendValueBadge({
  direction,
  value,
}: {
  direction: TrendDirection;
  value: number;
}) {
  const { icon } = getTrendBadgeContent(direction);

  return (
    <TrendBadge direction={direction}>
      {icon}
      {formatPercent(value)}
    </TrendBadge>
  );
}

function MarketTopList({
  items,
  secondaryMetric,
  isInteractive,
  onSelect,
}: {
  items: Stock[];
  secondaryMetric: "change" | "turnover";
  isInteractive: boolean;
  onSelect: (stock: Stock) => void;
}) {
  if (!items.length) {
    return (
      <div className="text-muted-foreground bg-muted/30 rounded-2xl px-4 py-6 text-center text-sm">
        Нет данных за текущую сессию
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const direction = getTrendDirection(item.changePercent);

        return (
          <button
            type="button"
            key={item.ticker}
            disabled={!isInteractive}
            onClick={() => onSelect(item)}
            className={cn(
              "grid w-full items-center gap-3 rounded-2xl px-1 py-2 text-left transition-colors",
              secondaryMetric === "turnover"
                ? "grid-cols-[minmax(0,1fr)_96px] sm:grid-cols-[minmax(0,1fr)_120px_112px]"
                : "grid-cols-[minmax(0,1fr)_112px]",
              isInteractive
                ? "hover:bg-muted/40 cursor-pointer"
                : "cursor-default"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <CompanyLogo
                ticker={item.ticker}
                name={item.name}
                className="size-9 rounded-full border-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm leading-tight font-medium sm:truncate">
                  {item.name}
                </div>
                <div className="text-muted-foreground text-sm tracking-[0.08em] uppercase sm:truncate">
                  {item.ticker}
                </div>
              </div>
            </div>

            {secondaryMetric === "turnover" ? (
              <div className="w-full text-right">
                <div className="text-sm font-medium tabular-nums md:text-[15px]">
                  {formatTurnoverMillions(item.tradedValue)}
                </div>
                <div
                  className={cn(
                    "text-sm font-medium tabular-nums sm:hidden",
                    direction === "positive" && "text-primary",
                    direction === "negative" && "text-destructive",
                    direction === "neutral" && "text-muted-foreground"
                  )}
                >
                  {formatPercent(item.changePercent)}
                </div>
              </div>
            ) : null}

            {secondaryMetric === "turnover" ? (
              <div className="hidden w-full text-right sm:block">
                <div className="text-sm font-medium tabular-nums md:text-[15px]">
                  {formatPrice(item.price)}
                </div>
                <div
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    direction === "positive" && "text-primary",
                    direction === "negative" && "text-destructive",
                    direction === "neutral" && "text-muted-foreground"
                  )}
                >
                  {formatPercent(item.changePercent)}
                </div>
              </div>
            ) : (
              <div className="w-full text-right">
                <div className="text-sm font-medium tabular-nums md:text-[15px]">
                  {formatPrice(item.price)}
                </div>
                <div
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    direction === "positive" && "text-primary",
                    direction === "negative" && "text-destructive",
                    direction === "neutral" && "text-muted-foreground"
                  )}
                >
                  {formatPercent(item.changePercent)}
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SectionCards({ summary }: { summary: MarketSummary }) {
  const router = useRouter();
  const moexIndexDirection = getTrendDirection(summary.moexIndexChangePercent);
  const [leadersView, setLeadersView] = React.useState<"gainers" | "losers">(
    "gainers"
  );
  const leaderItems =
    leadersView === "gainers" ? summary.topGainers : summary.topLosers;

  function handleSelectStock(stock: Stock) {
    router.push(`/chart?ticker=${stock.ticker}`);
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2">
      <Card className="@container/card @xl/main:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold tabular-nums @[250px]/card:text-xl">
            Индекс Мосбиржи
          </CardTitle>
          <CardDescription>{summary.moexIndexLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-semibold tabular-nums">
            {formatIndexValue(summary.moexIndexValue)} пт.
          </div>
          <TrendValueBadge
            direction={moexIndexDirection}
            value={summary.moexIndexChangePercent}
          />
        </CardContent>
      </Card>

      <Card className="@container/card @xl/main:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold @[250px]/card:text-xl">
            Валютные пары
          </CardTitle>
          <CardDescription>Курсы и быстрый обмен</CardDescription>
        </CardHeader>
        <CardContent>
          <FxTradePanel currencyRates={summary.currencyRates} />
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold @[250px]/card:text-xl">
            Лидеры по обороту
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MarketTopList
            items={summary.mostActiveStocks}
            secondaryMetric="turnover"
            isInteractive
            onSelect={handleSelectStock}
          />
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold @[250px]/card:text-xl">
            Взлёты и падения дня
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-6 text-sm md:text-[15px]">
            <button
              type="button"
              className={cn(
                "transition-colors",
                leadersView === "gainers"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              onClick={() => setLeadersView("gainers")}
            >
              Растут сегодня
            </button>
            <button
              type="button"
              className={cn(
                "transition-colors",
                leadersView === "losers"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              onClick={() => setLeadersView("losers")}
            >
              Падают сегодня
            </button>
          </div>
          <MarketTopList
            items={leaderItems}
            secondaryMetric="change"
            isInteractive
            onSelect={handleSelectStock}
          />
        </CardContent>
      </Card>
    </div>
  );
}
