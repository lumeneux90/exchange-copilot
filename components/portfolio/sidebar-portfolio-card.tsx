"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { DepositFundsSheet } from "@/components/deposit-funds-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import {
  buildPortfolioSnapshot,
  usePortfolio,
} from "@/src/features/portfolio/model/portfolio-context";
import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import type { Stock } from "@/src/entities/stock/model/types";
import {
  formatSignedCurrency,
  formatSignedPercent,
  rubFormatter,
} from "@/src/lib/money";
import { cn } from "@/src/lib/utils";

const allocationChartConfig = {
  rub: {
    label: "Рубли",
    color: "var(--ring)",
  },
  usd: {
    label: "Доллары",
    color: "var(--chart-2)",
  },
  stocks: {
    label: "Акции",
    color: "var(--primary)",
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
      ? "text-chart-2"
      : snapshot.totalProfitLoss < 0
        ? "text-destructive"
        : "text-muted-foreground";
  const totalValue = snapshot.totalValue || 0;
  const segmentValues = {
    rub: snapshot.cashBalance,
    usd: snapshot.currenciesMarketValue,
    stocks: snapshot.marketValue,
  } as const;
  const visibleSegmentKeys = (
    Object.entries(segmentValues) as Array<[keyof typeof segmentValues, number]>
  )
    .filter(([, value]) => value > 0)
    .map(([key]) => key);
  const firstVisibleSegmentKey = visibleSegmentKeys[0] ?? null;
  const lastVisibleSegmentKey =
    visibleSegmentKeys[visibleSegmentKeys.length - 1] ?? null;
  const getSegmentRadius = (
    key: keyof typeof segmentValues
  ): [number, number, number, number] => {
    if (!visibleSegmentKeys.length || !visibleSegmentKeys.includes(key)) {
      return [0, 0, 0, 0];
    }

    const isFirst = firstVisibleSegmentKey === key;
    const isLast = lastVisibleSegmentKey === key;

    if (isFirst && isLast) {
      return [999, 999, 999, 999];
    }

    if (isFirst) {
      return [999, 0, 0, 999];
    }

    if (isLast) {
      return [0, 999, 999, 0];
    }

    return [0, 0, 0, 0];
  };
  const cashRadius = getSegmentRadius("rub");
  const stocksRadius = getSegmentRadius("stocks");
  const fxRadius = getSegmentRadius("usd");
  const allocationSegments = [
    {
      chartKey: "rub",
      color: allocationChartConfig.rub.color,
      label: "Рубли",
      share: totalValue > 0 ? snapshot.cashBalance / totalValue : 0,
      value: snapshot.cashBalance,
    },
    {
      chartKey: "usd",
      color: allocationChartConfig.usd.color,
      label: "Доллары",
      share: totalValue > 0 ? snapshot.currenciesMarketValue / totalValue : 0,
      value: snapshot.currenciesMarketValue,
    },
    {
      chartKey: "stocks",
      color: allocationChartConfig.stocks.color,
      label: "Акции",
      share: totalValue > 0 ? snapshot.marketValue / totalValue : 0,
      value: snapshot.marketValue,
    },
  ];
  const allocationChartData = [
    {
      allocation: "portfolio",
      rub: snapshot.cashBalance,
      usd: snapshot.currenciesMarketValue,
      stocks: snapshot.marketValue,
    },
  ];

  return (
    <SidebarGroup>
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
                    dataKey="rub"
                    stackId="allocation"
                    fill="var(--color-rub)"
                    radius={cashRadius}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="usd"
                    stackId="allocation"
                    fill="var(--color-usd)"
                    radius={fxRadius}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="stocks"
                    stackId="allocation"
                    fill="var(--color-stocks)"
                    radius={stocksRadius}
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
                      className="inline-flex size-2 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span>{segment.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground font-medium">
                      {rubFormatter.format(segment.value)}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {(segment.share * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="grid grid-cols-2 gap-2">
            <DepositFundsSheet
              triggerLabel="Пополнить"
              triggerClassName="w-full"
            />
            <DepositFundsSheet
              operation="withdraw"
              triggerLabel="Вывести"
              triggerVariant="destructive"
              triggerClassName="w-full"
            />
          </CardFooter>
        </Card>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
