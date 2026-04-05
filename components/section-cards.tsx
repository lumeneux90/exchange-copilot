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
  gainers: number;
  losers: number;
  moexIndexChangePercent: number;
  moexIndexLabel: string;
  moexIndexValue: number;
  strongestGainerChangePercent: number;
  strongestGainerLabel: string;
  strongestLoserChangePercent: number;
  strongestLoserLabel: string;
  totalStocks: number;
};

type TrendDirection = "positive" | "negative" | "neutral";

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatIndexValue(value: number) {
  return value > 0 ? value.toFixed(2) : "—";
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
  const moexIndexDirection = getTrendDirection(summary.moexIndexChangePercent);
  const strongestGainerDirection = getTrendDirection(
    summary.strongestGainerChangePercent
  );
  const strongestLoserDirection = getTrendDirection(
    summary.strongestLoserChangePercent
  );

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>IMOEX</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatIndexValue(summary.moexIndexValue)}
          </CardTitle>
          <CardAction>
            <TrendValueBadge
              direction={moexIndexDirection}
              value={summary.moexIndexChangePercent}
            />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Индекс Мосбиржи</div>
          <div className="text-muted-foreground">
            Официальный ориентир по российскому рынку акций
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
          <CardDescription>Сильнейший рост</CardDescription>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl">
            {summary.strongestGainerLabel}
          </CardTitle>
          <CardAction>
            <TrendValueBadge
              direction={strongestGainerDirection}
              value={summary.strongestGainerChangePercent}
            />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Лучшая бумага в выборке сегодня</div>
          <div className="text-muted-foreground">
            По относительному изменению к цене открытия
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Сильнейшее падение</CardDescription>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl">
            {summary.strongestLoserLabel}
          </CardTitle>
          <CardAction>
            <TrendValueBadge
              direction={strongestLoserDirection}
              value={summary.strongestLoserChangePercent}
            />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Слабейшая бумага в выборке сегодня</div>
          <div className="text-muted-foreground">
            По относительному изменению к цене открытия
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
