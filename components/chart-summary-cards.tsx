"use client";

import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react";

import {
  CandleRange,
  formatPercent,
  formatPrice,
  formatVolume,
  getRangeChangeClass,
  rangeLabels,
} from "@/components/chart-area-interactive.helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/src/lib/utils";

type ChartSummaryCardsProps = {
  selectedStock: {
    ticker: string;
    name: string;
  } | null;
  range: CandleRange;
  latestPrice: number | null;
  periodOpenPrice: number | null;
  rangeChange: number;
  totalVolume: number | null;
};

export function ChartSummaryCards({
  selectedStock,
  range,
  latestPrice,
  periodOpenPrice,
  rangeChange,
  totalVolume,
}: ChartSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card size="sm">
        <CardHeader className="gap-0.5">
          <CardDescription>Выбранная бумага</CardDescription>
          <CardTitle className="text-lg font-semibold">
            {selectedStock?.ticker ?? "n/a"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground truncate text-sm">
            {selectedStock?.name ?? "Нет данных"}
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader className="gap-0.5">
          <CardDescription>
            Последняя цена за {rangeLabels[range].toLowerCase()}
          </CardDescription>
          <CardTitle className="text-lg font-semibold">
            {latestPrice !== null ? formatPrice(latestPrice) : "Нет данных"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">
            Открытие:{" "}
            {periodOpenPrice !== null ? formatPrice(periodOpenPrice) : "n/a"}
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader className="gap-0.5">
          <CardDescription>Изменение за период</CardDescription>
          <CardTitle
            className={cn(
              "flex items-center gap-1 text-lg font-semibold",
              getRangeChangeClass(rangeChange)
            )}
          >
            {rangeChange >= 0 ? (
              <RiArrowUpLine className="size-4" />
            ) : (
              <RiArrowDownLine className="size-4" />
            )}
            {formatPercent(rangeChange)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">
            Объём: {totalVolume !== null ? formatVolume(totalVolume) : "n/a"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
