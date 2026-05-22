"use client";

import Link from "next/link";
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
import { useFinance } from "@/src/features/finance/model/finance-context";
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

const usdFormatter = new Intl.NumberFormat("ru-RU", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

function getSpotRubValue(
  accounts: Array<{ asset: string; balance: number }>,
  usdRubRate: number
) {
  const rubBalance =
    accounts.find((account) => account.asset === "RUB")?.balance ?? 0;
  const usdBalance =
    accounts.find((account) => account.asset === "USD")?.balance ?? 0;
  const usdtBalance =
    accounts.find((account) => account.asset === "USDT")?.balance ?? 0;

  return rubBalance + (usdBalance + usdtBalance) * usdRubRate;
}

export function SidebarPortfolioCard({
  stocks,
  usdRubRate = 0,
}: {
  stocks: Stock[];
  usdRubRate?: number;
}) {
  const { portfolio } = usePortfolio();
  const { finance } = useFinance();
  const snapshot = buildPortfolioSnapshot(portfolio, stocks, usdRubRate);
  const spotRubValue = getSpotRubValue(finance.accounts, usdRubRate);
  const portfolioTrendTone =
    snapshot.totalProfitLoss > 0
      ? "text-chart-2"
      : snapshot.totalProfitLoss < 0
        ? "text-destructive"
        : "text-muted-foreground";
  const totalValue = snapshot.totalValue || 0;
  const segmentValues = {
    rub: snapshot.cashBalance,
    usd: snapshot.usdMarketValue,
    stocks: snapshot.marketValue,
  } as const;
  const allocationSegments = [
    {
      chartKey: "rub" as const,
      color: allocationChartConfig.rub.color,
      label: "Рубли",
      share: totalValue > 0 ? snapshot.cashBalance / totalValue : 0,
      value: snapshot.cashBalance,
      valueLabel: rubFormatter.format(snapshot.cashBalance),
    },
    {
      chartKey: "usd" as const,
      color: allocationChartConfig.usd.color,
      label: "Доллары",
      share: totalValue > 0 ? snapshot.usdMarketValue / totalValue : 0,
      value: snapshot.usdMarketValue,
      valueLabel: usdFormatter.format(snapshot.usdCashBalance),
    },
    {
      chartKey: "stocks" as const,
      color: allocationChartConfig.stocks.color,
      label: "Акции",
      share: totalValue > 0 ? snapshot.marketValue / totalValue : 0,
      value: snapshot.marketValue,
      valueLabel: rubFormatter.format(snapshot.marketValue),
    },
  ].filter((segment) => segment.value > 0);
  const visibleSegmentKeys = allocationSegments.map(
    (segment) => segment.chartKey
  );
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
  const usdRadius = getSegmentRadius("usd");
  const allocationChartData = [
    {
      allocation: "portfolio",
      rub: snapshot.cashBalance,
      usd: snapshot.usdMarketValue,
      stocks: snapshot.marketValue,
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <Card className="bg-sidebar-accent/30 gap-3 border py-3">
          <CardHeader className="gap-1">
            <CardDescription>Брокерский счёт</CardDescription>
            <CardTitle className="text-lg font-semibold">
              {rubFormatter.format(totalValue)}
            </CardTitle>
            <div className="text-muted-foreground text-[11px]">
              Результат по акциям
            </div>
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
            {spotRubValue > 0 ? (
              <Link
                href="/finances"
                className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
              >
                На споте: {rubFormatter.format(spotRubValue)}
              </Link>
            ) : null}
          </CardHeader>
          {allocationSegments.length > 0 ? (
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
                    {visibleSegmentKeys.includes("rub") ? (
                      <Bar
                        dataKey="rub"
                        stackId="allocation"
                        fill="var(--color-rub)"
                        radius={cashRadius}
                        isAnimationActive={false}
                      />
                    ) : null}
                    {visibleSegmentKeys.includes("usd") ? (
                      <Bar
                        dataKey="usd"
                        stackId="allocation"
                        fill="var(--color-usd)"
                        radius={usdRadius}
                        isAnimationActive={false}
                      />
                    ) : null}
                    {visibleSegmentKeys.includes("stocks") ? (
                      <Bar
                        dataKey="stocks"
                        stackId="allocation"
                        fill="var(--color-stocks)"
                        radius={stocksRadius}
                        isAnimationActive={false}
                      />
                    ) : null}
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
                        {segment.valueLabel}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        {(segment.share * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          ) : null}
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
