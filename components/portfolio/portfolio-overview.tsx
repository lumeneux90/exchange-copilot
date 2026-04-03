"use client";

import { RiPieChartLine } from "@remixicon/react";

import { CompanyLogo } from "@/components/company-logo";
import { DepositFundsSheet } from "@/components/deposit-funds-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import React from "react";

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatSignedCurrency(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${rubFormatter.format(value)}`;
}

export function PortfolioOverview({ stocks }: { stocks: Stock[] }) {
  const { portfolio } = usePortfolio();
  const snapshot = buildPortfolioSnapshot(portfolio, stocks);
  const stocksByTicker = React.useMemo(
    () => new Map(stocks.map((stock) => [stock.ticker, stock])),
    [stocks]
  );

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Общая стоимость</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {rubFormatter.format(snapshot.totalValue)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-muted-foreground">
            Наличные плюс текущая оценка всех позиций
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Свободные деньги</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {rubFormatter.format(snapshot.cashBalance)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-muted-foreground">
            Баланс, доступный для будущих заявок
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>В рынке</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {rubFormatter.format(snapshot.marketValue)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-muted-foreground">
            {snapshot.positionsCount} открытых позиции в портфеле
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Результат по позициям</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {formatSignedCurrency(snapshot.totalProfitLoss)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-muted-foreground">
            {formatSignedPercent(snapshot.totalProfitLossPercent)} относительно
            средней цены входа
          </CardFooter>
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
                      <div className="text-sm font-semibold">
                        {holding.ticker}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {stock?.name ?? "Компания"}
                      </div>
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
                    <div className="text-sm font-medium">
                      {formatSignedCurrency(holding.profitLoss)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Доходность
                    </div>
                    <div className="text-sm font-medium">
                      {formatSignedPercent(holding.profitLossPercent)}
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
                  Пожалуйста, пополните ваш счет.
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
