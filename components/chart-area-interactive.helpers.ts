import type { ChartConfig } from "@/components/ui/chart";

export type CandleRange = "day" | "week" | "month" | "year";

export type CandleResponseItem = {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  begin: string;
  end: string;
};

export type ChartPoint = CandleResponseItem & {
  label: string;
};

export const rangeLabels: Record<CandleRange, string> = {
  day: "День",
  week: "Неделя",
  month: "Месяц",
  year: "Год",
};

export const chartConfig = {
  close: {
    label: "Цена",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function buildChartData(candles: CandleResponseItem[]): ChartPoint[] {
  return candles.map((candle) => ({
    ...candle,
    label: candle.begin,
  }));
}

export function formatPrice(value: number) {
  return `${value.toFixed(2)} RUB`;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(value: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

export function getRangeChange(candles: CandleResponseItem[]) {
  if (!candles.length) {
    return 0;
  }

  const firstOpen = candles[0]?.open ?? 0;
  const lastClose = candles.at(-1)?.close ?? 0;

  return firstOpen > 0 ? ((lastClose - firstOpen) / firstOpen) * 100 : 0;
}

export function getRangeChangeClass(value: number) {
  if (value > 0) {
    return "text-primary";
  }

  if (value < 0) {
    return "text-destructive";
  }

  return "text-muted-foreground";
}

export function getTotalVolume(candles: CandleResponseItem[]) {
  return candles.reduce((sum, candle) => sum + candle.volume, 0);
}

const RU_MONTHS_LONG = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

const RU_MONTHS_SHORT = [
  "янв.",
  "февр.",
  "март",
  "апр.",
  "май",
  "июнь",
  "июль",
  "авг.",
  "сент.",
  "окт.",
  "нояб.",
  "дек.",
] as const;

type ParsedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: string;
  minute: string;
};

function parseDateParts(value: string): ParsedDateParts | null {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?)?/
  );

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4] ?? "00",
    minute: match[5] ?? "00",
  };
}

export function formatAxisLabel(value: string, range: CandleRange) {
  const date = parseDateParts(value);

  if (!date) {
    return value;
  }

  if (range === "day") {
    return `${date.hour}:${date.minute}`;
  }

  if (range === "year") {
    return RU_MONTHS_SHORT[date.month - 1] ?? value;
  }

  return `${String(date.day).padStart(2, "0")}.${String(date.month).padStart(
    2,
    "0"
  )}`;
}

export function formatTooltipLabel(value: string, range: CandleRange) {
  const date = parseDateParts(value);

  if (!date) {
    return value;
  }

  const day = String(date.day).padStart(2, "0");
  const month = RU_MONTHS_LONG[date.month - 1] ?? "";

  if (range === "day") {
    return `${day} ${month}, ${date.hour}:${date.minute}`;
  }

  if (range === "year") {
    return `${date.day} ${month} ${date.year}`;
  }

  return `${date.day} ${month}`;
}

export function getChartDomain(data: ChartPoint[]) {
  if (!data.length) {
    return ["auto", "auto"] as const;
  }

  const values = data.flatMap((point) => [point.low, point.high]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = Math.max(maxValue - minValue, maxValue * 0.01, 1);
  const padding = spread * 0.12;

  return [Math.max(0, minValue - padding), maxValue + padding] as const;
}
