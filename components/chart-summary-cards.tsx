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
import { cn } from "@/src/lib/utils";

type ChartSummaryCardsProps = {
  range: CandleRange;
  latestPrice: number | null;
  periodOpenPrice: number | null;
  rangeChange: number;
  totalVolume: number | null;
};

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-dashed px-3 py-2">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className={cn("truncate text-sm font-medium", className)}>
        {value}
      </span>
    </div>
  );
}

export function ChartSummaryCards({
  range,
  latestPrice,
  periodOpenPrice,
  rangeChange,
  totalVolume,
}: ChartSummaryCardsProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
      <Metric
        label="Последняя цена"
        value={latestPrice !== null ? formatPrice(latestPrice) : "Нет данных"}
      />
      <Metric
        label="Открытие"
        value={
          periodOpenPrice !== null ? formatPrice(periodOpenPrice) : "Нет данных"
        }
      />
      <Metric
        label="Изм."
        value={
          <span className="inline-flex items-center gap-1">
            {rangeChange >= 0 ? (
              <RiArrowUpLine className="size-4" />
            ) : (
              <RiArrowDownLine className="size-4" />
            )}
            {formatPercent(rangeChange)}
          </span>
        }
        className={getRangeChangeClass(rangeChange)}
      />
      <Metric
        label="Объем"
        value={totalVolume !== null ? formatVolume(totalVolume) : "Нет данных"}
      />
      <Metric label="Период" value={rangeLabels[range]} />
    </div>
  );
}
