import type { ChartConfig } from "@/components/ui/chart";

export type CandleRange = "day" | "week" | "month" | "year" | "all";

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
  all: "Все",
};

export const chartConfig = {
  close: {
    label: "Цена",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function getXAxisTicks(data: ChartPoint[], range: CandleRange) {
  if (range !== "all") {
    return undefined;
  }

  const ticks: string[] = [];
  const seenYears = new Set<number>();

  for (const point of data) {
    const date = parseDateParts(point.label);

    if (!date || seenYears.has(date.year)) {
      continue;
    }

    seenYears.add(date.year);
    ticks.push(point.label);
  }

  return ticks;
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

function getIsoWeek(parts: ParsedDateParts) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const day = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return {
    year: date.getUTCFullYear(),
    week,
  };
}

function groupCandleKey(candle: CandleResponseItem, range: CandleRange) {
  const date = parseDateParts(candle.begin);

  if (!date) {
    return candle.begin;
  }

  if (range === "all") {
    return `${date.year}-${String(date.month).padStart(2, "0")}`;
  }

  if (range === "year") {
    const isoWeek = getIsoWeek(date);

    return `${isoWeek.year}-W${String(isoWeek.week).padStart(2, "0")}`;
  }

  return candle.begin;
}

function aggregateCandles(
  candles: CandleResponseItem[],
  range: CandleRange
): CandleResponseItem[] {
  if (range !== "year" && range !== "all") {
    return candles;
  }

  const groups = new Map<string, CandleResponseItem[]>();

  for (const candle of candles) {
    const key = groupCandleKey(candle, range);
    const existing = groups.get(key);

    if (existing) {
      existing.push(candle);
    } else {
      groups.set(key, [candle]);
    }
  }

  return Array.from(groups.values()).map((group) => {
    const first = group[0];
    const last = group[group.length - 1];

    return {
      open: first.open,
      close: last.close,
      high: Math.max(...group.map((item) => item.high)),
      low: Math.min(...group.map((item) => item.low)),
      volume: group.reduce((sum, item) => sum + item.volume, 0),
      begin: first.begin,
      end: last.end,
    };
  });
}

export function buildChartData(
  candles: CandleResponseItem[],
  range: CandleRange
): ChartPoint[] {
  return aggregateCandles(candles, range).map((candle) => ({
    ...candle,
    label: candle.begin,
  }));
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

  if (range === "all") {
    return String(date.year);
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

  if (range === "all") {
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
