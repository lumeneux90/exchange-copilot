"use client";

import Link from "next/link";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { RiArrowRightUpLine } from "@remixicon/react";

import { DepositFundsSheet } from "@/components/deposit-funds-sheet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  buildPortfolioSnapshot,
  usePortfolio,
} from "@/src/features/portfolio/model/portfolio-context";
import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import type { Stock } from "@/src/entities/stock/model/types";
import { cn } from "@/src/lib/utils";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const allocationChartConfig = {
  cash: {
    label: "Свободные деньги",
    color:
      "color-mix(in oklab, var(--color-muted-foreground) 35%, transparent)",
  },
  stocks: {
    label: "Акции",
    color: "var(--primary)",
  },
  fx: {
    label: "Валюта",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export function SidebarPortfolioCard({
  currencyRates,
  stocks,
}: {
  currencyRates: CurrencyRate[];
  stocks: Stock[];
}) {
  const { portfolio } = usePortfolio();
  const snapshot = buildPortfolioSnapshot(portfolio, stocks, currencyRates);
  const portfolioTrendTone =
    snapshot.totalProfitLoss > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : snapshot.totalProfitLoss < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";
  const investedValue = snapshot.marketValue + snapshot.currenciesMarketValue;
  const totalValue = snapshot.totalValue || 0;
  const allocationSegments = [
    {
      chartKey: "cash",
      color: "bg-muted-foreground/35",
      label: "Свободные деньги",
      share: snapshot.cashBalance / totalValue,
      value: snapshot.cashBalance,
    },
    {
      chartKey: "stocks",
      color: "bg-primary",
      label: "Акции",
      share: snapshot.marketValue / totalValue,
      value: snapshot.marketValue,
    },
    {
      chartKey: "fx",
      color: "bg-amber-500",
      label: "Валюта",
      share: snapshot.currenciesMarketValue / totalValue,
      value: snapshot.currenciesMarketValue,
    },
  ];
  const allocationChartData = [
    {
      allocation: "portfolio",
      cash: snapshot.cashBalance,
      stocks: snapshot.marketValue,
      fx: snapshot.currenciesMarketValue,
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Портфель</SidebarGroupLabel>
      <SidebarGroupContent>
        <Card className="bg-sidebar-accent/30 gap-3 border py-3">
          <CardHeader className="gap-1">
            <CardDescription>Текущий счет</CardDescription>
            <CardTitle className="text-lg font-semibold">
              {rubFormatter.format(totalValue)}
            </CardTitle>
            <div
              className={cn(
                "flex items-center gap-2 text-xs font-medium",
                portfolioTrendTone
              )}
            >
              <span>{formatSignedCurrency(snapshot.totalProfitLoss)}</span>
              <span>
                {formatSignedPercent(snapshot.totalProfitLossPercent)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-xs">
            <div className="bg-border/70 rounded-full p-[2px]">
              <ChartContainer
                config={allocationChartConfig}
                className="h-2.5 w-full [&_.recharts-rectangle]:stroke-0"
              >
                <BarChart
                  data={allocationChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                  barCategoryGap={0}
                  barGap={0}
                >
                  <XAxis type="number" hide domain={[0, totalValue]} />
                  <YAxis type="category" dataKey="allocation" hide />
                  <Bar
                    dataKey="cash"
                    stackId="allocation"
                    fill="var(--color-cash)"
                    radius={[999, 0, 0, 999]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="stocks"
                    stackId="allocation"
                    fill="var(--color-stocks)"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="fx"
                    stackId="allocation"
                    fill="var(--color-fx)"
                    radius={[0, 999, 999, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
            </div>

            <div className="grid gap-2">
              {allocationSegments.map((segment) => (
                <div
                  key={segment.label}
                  className="text-muted-foreground flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex size-2 rounded-full",
                        segment.color
                      )}
                    />
                    <span>{segment.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground font-medium">
                      {rubFormatter.format(segment.value)}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {(segment.share * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>Инвестировано</ItemTitle>
                <ItemDescription>
                  {rubFormatter.format(investedValue)}
                </ItemDescription>
              </ItemContent>
            </Item>
          </CardContent>
          <CardFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full"
              render={<Link href="/portfolio" />}
            >
              <RiArrowRightUpLine />
              Перейти
            </Button>
            <DepositFundsSheet
              triggerLabel="Пополнить"
              triggerClassName="w-full"
            />
          </CardFooter>
        </Card>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatSignedCurrency(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${rubFormatter.format(value)}`;
}
