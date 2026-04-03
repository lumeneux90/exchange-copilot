import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiExchangeFundsLine,
} from "@remixicon/react";

import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/src/lib/utils";

type MarketSummary = {
  averageChangePercent: number;
  averagePrice: number;
  gainers: number;
  losers: number;
  totalStocks: number;
  topMoverChangePercent: number;
  topMoverLabel: string;
};

type TrendDirection = "positive" | "negative" | "neutral";

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} RUB`;
}

function getTrendDirection(value: number): TrendDirection {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "neutral";
}

function getTrendTextStyle(
  direction: TrendDirection
): React.CSSProperties | undefined {
  switch (direction) {
    case "positive":
      return { color: "var(--primary)" };
    case "negative":
      return { color: "var(--destructive)" };
    default:
      return undefined;
  }
}

function getTrendBadgeStyle(
  direction: TrendDirection
): React.CSSProperties | undefined {
  switch (direction) {
    case "positive":
      return { color: "var(--primary)" };
    case "negative":
      return { color: "var(--destructive)" };
    default:
      return undefined;
  }
}

function getTrendBadgeContent(direction: TrendDirection) {
  switch (direction) {
    case "positive":
      return {
        icon: <RiArrowUpLine />,
        label: "Рост",
      };
    case "negative":
      return {
        icon: <RiArrowDownLine />,
        label: "Снижение",
      };
    default:
      return {
        icon: <RiExchangeFundsLine />,
        label: "Без изм.",
      };
  }
}

function TrendBadge({
  direction,
  children,
}: {
  direction: TrendDirection;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-1 text-xs font-medium"
      style={getTrendBadgeStyle(direction)}
    >
      {children}
    </div>
  );
}

function TrendStatusBadge({ direction }: { direction: TrendDirection }) {
  const { icon, label } = getTrendBadgeContent(direction);

  return (
    <TrendBadge direction={direction}>
      {icon}
      {label}
    </TrendBadge>
  );
}

function TrendValueBadge({
  direction,
  value,
}: {
  direction: TrendDirection;
  value: number;
}) {
  const { icon } = getTrendBadgeContent(direction);

  return (
    <TrendBadge direction={direction}>
      {icon}
      {formatPercent(value)}
    </TrendBadge>
  );
}

export function SectionCards({ summary }: { summary: MarketSummary }) {
  const averageChangeDirection = getTrendDirection(
    summary.averageChangePercent
  );
  const topMoverDirection = getTrendDirection(summary.topMoverChangePercent);

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Средняя цена</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPrice(summary.averagePrice)}
          </CardTitle>
          <CardAction className="row-span-1 self-center">
            <div className="text-muted-foreground text-xs font-medium">
              {summary.totalStocks} бумаг
            </div>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Срез по крупнейшим компаниям MOEX</div>
          <div className="text-muted-foreground">
            Средняя цена из {summary.totalStocks} крупнейших на Мосбирже
            компаний по капитализации
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Баланс рынка</CardDescription>
          <CardTitle
            className={cn(
              "text-2xl font-semibold tabular-nums @[250px]/card:text-3xl"
            )}
            style={getTrendTextStyle(averageChangeDirection)}
          >
            {formatPercent(summary.averageChangePercent)}
          </CardTitle>
          <CardAction>
            <TrendStatusBadge direction={averageChangeDirection} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            {summary.gainers} растут, {summary.losers} снижаются
          </div>
          <div className="text-muted-foreground">
            Среднее изменение относительно цены открытия
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Лидеры роста</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {summary.gainers}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Бумаги с положительной динамикой</div>
          <div className="text-muted-foreground">
            Количество акций выше цены открытия
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Самый сильный сдвиг</CardDescription>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl">
            {summary.topMoverLabel}
          </CardTitle>
          <CardAction>
            <TrendValueBadge
              direction={topMoverDirection}
              value={summary.topMoverChangePercent}
            />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Наибольшее изменение в выборке</div>
          <div className="text-muted-foreground">
            По относительному изменению к цене открытия
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
