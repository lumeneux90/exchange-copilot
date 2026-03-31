import { RiArrowDownLine, RiArrowUpLine, RiExchangeFundsLine } from "@remixicon/react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type MarketSummary = {
  averageChangePercent: number
  averagePrice: number
  gainers: number
  losers: number
  totalStocks: number
  topMoverChangePercent: number
  topMoverLabel: string
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : ""

  return `${sign}${value.toFixed(2)}%`
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} RUB`
}

export function SectionCards({ summary }: { summary: MarketSummary }) {
  const averageChangeIsPositive = summary.averageChangePercent >= 0
  const topMoverIsPositive = summary.topMoverChangePercent >= 0

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Средняя цена</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPrice(summary.averagePrice)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiExchangeFundsLine />
              {summary.totalStocks} бумаг
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Срез по текущему списку лидеров</div>
          <div className="text-muted-foreground">
            Средняя цена из {summary.totalStocks} загруженных акций
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Баланс рынка</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPercent(summary.averageChangePercent)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {averageChangeIsPositive ? <RiArrowUpLine /> : <RiArrowDownLine />}
              {averageChangeIsPositive ? "Рост" : "Снижение"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            {summary.gainers} растут, {summary.losers} снижаются
          </div>
          <div className="text-muted-foreground">
            Среднее изменение относительно предыдущей цены
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Лидеры роста</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {summary.gainers}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowUpLine />
              Из {summary.totalStocks}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Бумаги с положительной динамикой</div>
          <div className="text-muted-foreground">
            Количество акций выше предыдущего закрытия
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
            <Badge variant="outline">
              {topMoverIsPositive ? <RiArrowUpLine /> : <RiArrowDownLine />}
              {formatPercent(summary.topMoverChangePercent)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Наибольшее изменение в выборке</div>
          <div className="text-muted-foreground">
            По относительному изменению к предыдущей цене
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
