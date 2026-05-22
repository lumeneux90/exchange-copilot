"use client";

import { useRouter } from "next/navigation";
import { RiPieChartLine } from "@remixicon/react";

import { CompanyLogo } from "@/components/company-logo";
import { DepositFundsSheet } from "@/components/deposit-funds-sheet";
import { TradeOrderSheet } from "@/components/trade-order-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { Stock } from "@/src/entities/stock/model/types";
import {
  buildPortfolioSnapshot,
  usePortfolio,
} from "@/src/features/portfolio/model/portfolio-context";
import {
  formatSignedCurrency,
  formatSignedPercent,
  rubFormatter,
} from "@/src/lib/money";
import { cn } from "@/src/lib/utils";
import React from "react";

function getTrendTone(value: number) {
  if (value > 0) {
    return "text-chart-2";
  }

  if (value < 0) {
    return "text-destructive";
  }

  return "text-foreground";
}

export function PortfolioOverview({
  stocks,
  usdRubRate = 0,
}: {
  stocks: Stock[];
  usdRubRate?: number;
}) {
  const router = useRouter();
  const { portfolio } = usePortfolio();
  const snapshot = buildPortfolioSnapshot(portfolio, stocks, usdRubRate);
  const stocksByTicker = React.useMemo(
    () => new Map(stocks.map((stock) => [stock.ticker, stock])),
    [stocks]
  );

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Брокерский счёт</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {rubFormatter.format(snapshot.totalValue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Результат по позициям</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl font-semibold",
                getTrendTone(snapshot.totalProfitLoss)
              )}
            >
              {formatSignedCurrency(snapshot.totalProfitLoss)}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card id="positions" className="min-h-[24rem]">
        <CardHeader>
          <CardDescription>Текущие позиции</CardDescription>
          <CardTitle>Структура портфеля</CardTitle>
        </CardHeader>
        {snapshot.holdings.length > 0 ? (
          <CardContent className="grid gap-3">
            {snapshot.holdings.map((holding) => {
              const stock = stocksByTicker.get(holding.ticker);
              const profitLossTone = getTrendTone(holding.profitLoss);
              const profitLossPercentTone = getTrendTone(
                holding.profitLossPercent
              );

              return (
                <div
                  key={holding.ticker}
                  className="hover:bg-muted/30 grid cursor-pointer gap-3 rounded-lg border p-4 text-left transition-colors md:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))_auto]"
                  role="button"
                  tabIndex={0}
                  aria-label={`Открыть график ${holding.ticker}`}
                  onClick={() => router.push(`/chart?ticker=${holding.ticker}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/chart?ticker=${holding.ticker}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <CompanyLogo
                      ticker={holding.ticker}
                      name={stock?.name}
                      className="size-10 rounded-lg"
                    />
                    <div className="min-w-0 space-y-1">
                      <span className="text-sm font-semibold">
                        {holding.ticker}
                      </span>
                      &nbsp;
                      <span className="text-muted-foreground truncate text-xs">
                        {stock?.name ?? "Компания"}
                      </span>
                      <div className="text-muted-foreground text-xs">
                        {holding.quantity} шт.
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Цена сейчас
                    </div>
                    <div className="text-sm font-medium">
                      {rubFormatter.format(holding.currentPrice)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Стоимость
                    </div>
                    <div className="text-sm font-medium">
                      {rubFormatter.format(holding.marketValue)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Результат
                    </div>
                    <div className={cn("text-sm font-medium", profitLossTone)}>
                      {formatSignedCurrency(holding.profitLoss)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Доходность
                    </div>
                    <div
                      className={cn(
                        "text-sm font-medium",
                        profitLossPercentTone
                      )}
                    >
                      {formatSignedPercent(holding.profitLossPercent)}
                    </div>
                  </div>
                  <div className="flex items-center md:justify-end">
                    <div
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <TradeOrderSheet
                        stock={stock ?? null}
                        triggerLabel="Совершить сделку"
                        triggerVariant="outline"
                        triggerClassName="w-full md:w-auto"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        ) : (
          <CardContent className="flex flex-1">
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiPieChartLine />
                </EmptyMedia>
                <EmptyTitle>Портфель пуст</EmptyTitle>
                <EmptyDescription>
                  Пожалуйста, пополните ваш счет и проведите сделку.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <DepositFundsSheet triggerLabel="Пополнить счет" />
              </EmptyContent>
            </Empty>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
