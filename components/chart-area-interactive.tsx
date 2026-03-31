"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import type { Stock } from "@/src/entities/stock/model/types"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const chartConfig = {
  currentPrice: {
    label: "Текущая цена",
    color: "var(--primary)",
  },
  previousPrice: {
    label: "Предыдущая цена",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig

function formatPrice(value: number) {
  return `${value.toFixed(2)} RUB`
}

export function ChartAreaInteractive({ stocks }: { stocks: Stock[] }) {
  const isMobile = useIsMobile()
  const [stockCount, setStockCount] = React.useState("15")

  React.useEffect(() => {
    if (isMobile) {
      setStockCount("5")
    }
  }, [isMobile])

  const sortedStocks = React.useMemo(
    () => [...stocks].sort((a, b) => b.price - a.price),
    [stocks]
  )

  const visibleStocks = React.useMemo(() => {
    const limit = Number(stockCount)

    return sortedStocks.slice(0, limit).reverse().map((stock) => ({
      ticker: stock.ticker,
      name: stock.name,
      currentPrice: stock.price,
      previousPrice: stock.previousPrice,
    }))
  }, [sortedStocks, stockCount])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Текущая цена против предыдущей</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Сравнение текущих и предыдущих цен по самым дорогим бумагам выборки
          </span>
          <span className="@[540px]/card:hidden">Сравнение цен по бумагам</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={stockCount ? [stockCount] : []}
            onValueChange={(value) => {
              setStockCount(value[0] ?? "15")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="15">15 бумаг</ToggleGroupItem>
            <ToggleGroupItem value="10">10 бумаг</ToggleGroupItem>
            <ToggleGroupItem value="5">5 бумаг</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={stockCount}
            onValueChange={(value) => {
              if (value !== null) {
                setStockCount(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Выберите размер выборки"
            >
              <SelectValue placeholder="15 бумаг" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="15" className="rounded-lg">
                15 бумаг
              </SelectItem>
              <SelectItem value="10" className="rounded-lg">
                10 бумаг
              </SelectItem>
              <SelectItem value="5" className="rounded-lg">
                5 бумаг
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[280px] w-full"
        >
          <AreaChart data={visibleStocks}>
            <defs>
              <linearGradient id="fillCurrentPrice" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-currentPrice)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-currentPrice)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPreviousPrice" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-previousPrice)"
                  stopOpacity={0.65}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-previousPrice)"
                  stopOpacity={0.08}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="ticker"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value, payload) => {
                    const item = payload?.[0]?.payload as
                      | { name?: string; ticker?: string }
                      | undefined

                    return item?.name ?? value
                  }}
                  formatter={(value) => formatPrice(Number(value))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="previousPrice"
              type="natural"
              fill="url(#fillPreviousPrice)"
              stroke="var(--color-previousPrice)"
              strokeWidth={2}
            />
            <Area
              dataKey="currentPrice"
              type="natural"
              fill="url(#fillCurrentPrice)"
              stroke="var(--color-currentPrice)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
