"use client";

import { RiPieChartLine } from "@remixicon/react";

import { CompanyLogo } from "@/components/company-logo";
import { CurrencyFlag } from "@/components/currency-flag";
import { DepositFundsSheet } from "@/components/deposit-funds-sheet";
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
import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import type { Stock } from "@/src/entities/stock/model/types";
import {
  buildPortfolioSnapshot,
  usePortfolio,
} from "@/src/features/portfolio/model/portfolio-context";
import {
  formatSignedCurrency,
  formatSignedPercent,
  rubFormatterRounded,
} from "@/src/lib/money";
import { cn } from "@/src/lib/utils";
import React from "react";

const currencyDisplayMap: Record<string, { label: string }> = {
  USD: { label: "Доллар США" },
  EUR: { label: "Евро" },
  CNY: { label: "Китайский юань" },
  GBP: { label: "Фунт стерлингов" },
  HKD: { label: "Гонконгский доллар" },
  AED: { label: "Дирхам ОАЭ" },
};

function formatCurrencyUnits(value: number, code: string) {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 4,
  }).format(value)} ${code}`;
}

function getTrendTone(value: number) {
  if (value > 0) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (value < 0) {
    return "text-red-600 dark:text-red-400";
  }

  return "text-foreground";
}

export function PortfolioOverview({
  currencyRates,
  stocks,
}: {
  currencyRates: CurrencyRate[];
  stocks: Stock[];
}) {
  const { portfolio } = usePortfolio();
  const snapshot = buildPortfolioSnapshot(portfolio, stocks, currencyRates);
  const stocksByTicker = React.useMemo(
    () => new Map(stocks.map((stock) => [stock.ticker, stock])),
    [stocks]
  );
  const hasAssets =
    snapshot.holdings.length > 0 || snapshot.currencies.length > 0;

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader>
              <CardDescription>Общая стоимость</CardDescription>
              <CardTitle className="text-2xl font-semibold">
              {rubFormatterRounded.format(snapshot.totalValue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
              <CardDescription>Свободные деньги</CardDescription>
              <CardTitle className="text-2xl font-semibold">
              {rubFormatterRounded.format(snapshot.cashBalance)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
              <CardDescription>Инвестировано</CardDescription>
              <CardTitle className="text-2xl font-semibold">
              {rubFormatterRounded.format(
                snapshot.marketValue + snapshot.currenciesMarketValue
              )}
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

      <Card>
        <CardHeader>
          <CardDescription>Валютные остатки</CardDescription>
        </CardHeader>
        {snapshot.currencies.length > 0 ? (
          <CardContent className="grid gap-3">
            {snapshot.currencies.map((currency) => {
              const profitLossTone = getTrendTone(currency.profitLoss);
              const profitLossPercentTone = getTrendTone(
                currency.profitLossPercent
              );
              const currencyDisplay = currencyDisplayMap[currency.code] ?? {
                label: currency.code,
              };

              return (
                <div
                  key={currency.code}
                  className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_repeat(4,minmax(0,1fr))]"
                >
                  <div className="flex items-center gap-3">
                    <CurrencyFlag code={currency.code} className="size-10" />
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-semibold">
                        {formatCurrencyUnits(currency.quantity, currency.code)}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {currencyDisplay.label}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Курс сейчас
                    </div>
                    <div className="text-sm font-medium">
                      {rubFormatterRounded.format(currency.currentRate)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Стоимость
                    </div>
                    <div className="text-sm font-medium">
                      {rubFormatterRounded.format(currency.marketValue)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Результат
                    </div>
                    <div className={cn("text-sm font-medium", profitLossTone)}>
                      {formatSignedCurrency(currency.profitLoss)}
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
                      {formatSignedPercent(currency.profitLossPercent)}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        ) : (
          <CardContent>
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              Пока нет валютных остатков.
            </div>
          </CardContent>
        )}
      </Card>

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
                  className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]"
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
                      {rubFormatterRounded.format(holding.currentPrice)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Стоимость
                    </div>
                    <div className="text-sm font-medium">
                      {rubFormatterRounded.format(holding.marketValue)}
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
                </div>
              );
            })}
          </CardContent>
        ) : !hasAssets ? (
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
        ) : (
          <CardContent>
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              Акций пока нет, но валютная часть портфеля уже активна.
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
