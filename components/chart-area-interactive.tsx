"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  RiArrowDownLine,
  RiExchangeFundsLine,
  RiArrowUpDownLine,
} from "@remixicon/react";

import type { Stock } from "@/src/entities/stock/model/types";
import {
  buildChartData,
  CandleRange,
  type CandleResponseItem,
  chartConfig,
  formatAxisLabel,
  formatPrice,
  formatTooltipLabel,
  getChartDomain,
  getRangeChange,
  getTotalVolume,
  rangeLabels,
} from "@/components/chart-area-interactive.helpers";
import { ChartSummaryCards } from "@/components/chart-summary-cards";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  RiCheckLine,
} from "@/components/ui/command";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/src/lib/utils";

type CandleRequestState = "loading" | "success" | "error";

export function ChartAreaInteractive({ stocks }: { stocks: Stock[] }) {
  const [selectedTicker, setSelectedTicker] = React.useState(
    stocks[0]?.ticker ?? ""
  );
  const [range, setRange] = React.useState<CandleRange>("day");
  const [isTickerOpen, setIsTickerOpen] = React.useState(false);
  const [candles, setCandles] = React.useState<CandleResponseItem[]>([]);
  const [requestState, setRequestState] = React.useState<CandleRequestState>(
    selectedTicker ? "loading" : "success"
  );

  React.useEffect(() => {
    if (!stocks.length) {
      return;
    }

    if (!selectedTicker) {
      setSelectedTicker(stocks[0].ticker);
    }
  }, [stocks, selectedTicker]);

  React.useEffect(() => {
    let isCancelled = false;

    async function loadCandles() {
      if (!selectedTicker) {
        setCandles([]);
        setRequestState("success");
        return;
      }

      setRequestState("loading");

      try {
        const response = await fetch(
          `/api/candles?ticker=${selectedTicker}&range=${range}`
        );

        if (!response.ok) {
          throw new Error("Failed to load candles");
        }

        const nextCandles = (await response.json()) as CandleResponseItem[];

        if (!isCancelled) {
          setCandles(nextCandles);
          setRequestState("success");
        }
      } catch {
        if (!isCancelled) {
          setCandles([]);
          setRequestState("error");
        }
      }
    }

    void loadCandles();

    return () => {
      isCancelled = true;
    };
  }, [range, selectedTicker]);

  const selectedStock =
    stocks.find((stock) => stock.ticker === selectedTicker) ??
    stocks[0] ??
    null;

  const chartData = React.useMemo(() => buildChartData(candles), [candles]);

  const latestCandle = candles.at(-1);
  const firstCandle = candles[0];
  const rangeChange = getRangeChange(candles);
  const totalVolume = React.useMemo(() => getTotalVolume(candles), [candles]);
  const chartDomain = React.useMemo(
    () => getChartDomain(chartData),
    [chartData]
  );
  const showLoadingState = requestState === "loading";
  const showErrorState = requestState === "error";
  const showEmptyState = requestState === "success" && !chartData.length;

  return (
    <Card className="@container/card">
      <CardHeader className="gap-4 border-b">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">
            Динамика акций
          </CardTitle>
        </div>
        <CardAction className="col-start-1 row-start-2 w-full justify-self-stretch @[920px]/card:col-start-2 @[920px]/card:row-start-1 @[920px]/card:w-auto">
          <div className="flex flex-col gap-3 @[920px]/card:items-end">
            <div className="flex w-full flex-col gap-3 @[920px]/card:w-auto @[920px]/card:flex-row @[920px]/card:items-start @[920px]/card:justify-end">
              <Popover open={isTickerOpen} onOpenChange={setIsTickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-between @[920px]/card:w-[26rem]"
                    />
                  }
                >
                  <span className="truncate">
                    {selectedStock
                      ? `${selectedStock.ticker} · ${selectedStock.name}`
                      : "Выберите тикер"}
                  </span>
                  <RiArrowUpDownLine data-icon="inline-end" />
                </PopoverTrigger>
                <PopoverContent className="w-[26rem] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Найти тикер или компанию" />
                    <CommandList>
                      <CommandEmpty>Ничего не найдено</CommandEmpty>
                      <CommandGroup heading="Тикеры">
                        {stocks.map((stock) => (
                          <CommandItem
                            key={stock.ticker}
                            value={`${stock.ticker} ${stock.name}`}
                            keywords={[stock.ticker, stock.name]}
                            onSelect={() => {
                              React.startTransition(() => {
                                setSelectedTicker(stock.ticker);
                                setIsTickerOpen(false);
                              });
                            }}
                          >
                            <RiCheckLine
                              className={cn(
                                selectedTicker === stock.ticker
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                              <span className="font-medium">
                                {stock.ticker}
                              </span>
                              <span className="text-muted-foreground truncate text-xs">
                                {stock.name}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <ToggleGroup
                multiple={false}
                value={[range]}
                onValueChange={(value) => {
                  const nextRange = value[0] as CandleRange | undefined;

                  if (nextRange) {
                    React.startTransition(() => {
                      setRange(nextRange);
                    });
                  }
                }}
                variant="outline"
                className="flex-wrap justify-start @[920px]/card:flex-nowrap @[920px]/card:justify-end"
              >
                {Object.entries(rangeLabels).map(([key, label]) => (
                  <ToggleGroupItem key={key} value={key}>
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5 px-4 pt-5 sm:px-6">
        <div className="grid gap-3 md:grid-cols-[1.35fr_0.65fr]">
          <ChartSummaryCards
            selectedStock={selectedStock}
            range={range}
            latestPrice={latestCandle?.close ?? null}
            periodOpenPrice={firstCandle?.open ?? null}
            rangeChange={rangeChange}
            totalVolume={candles.length ? totalVolume : null}
          />

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
            <Button className="h-10 text-sm">Купить</Button>
            <Button variant="destructive" className="h-10 text-sm">
              Продать
            </Button>
          </div>
        </div>

        {showLoadingState ? (
          <div className="text-muted-foreground flex h-[320px] w-full flex-col items-center justify-center gap-3 text-sm">
            <Spinner className="size-5" />
            <span>Загружаем историю по {selectedTicker}...</span>
          </div>
        ) : showErrorState ? (
          <div className="flex h-[320px] w-full items-center justify-center">
            <Empty className="max-w-md border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiArrowDownLine />
                </EmptyMedia>
                <EmptyTitle>Не удалось загрузить график</EmptyTitle>
                <EmptyDescription>
                  Не получилось получить историю выбранного инструмента.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : showEmptyState ? (
          <div className="flex h-[320px] w-full items-center justify-center">
            <Empty className="max-w-md border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiExchangeFundsLine />
                </EmptyMedia>
                <EmptyTitle>Нет данных за период</EmptyTitle>
                <EmptyDescription>
                  Для выбранного тикера и периода MOEX не вернул свечи.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[320px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillClosePrice" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-close)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-close)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tickFormatter={(value) => formatAxisLabel(String(value), range)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={80}
                domain={chartDomain}
                tickFormatter={(value) => `${Number(value).toFixed(0)} RUB`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value, payload) => {
                      const candle = payload?.[0]?.payload as
                        | CandleResponseItem
                        | undefined;

                      return candle
                        ? formatTooltipLabel(candle.begin, range)
                        : String(value);
                    }}
                    formatter={(value) => {
                      return (
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="block leading-none text-muted-foreground">
                            Цена
                          </span>
                          <span className="block leading-none text-right font-mono tabular-nums">
                            {formatPrice(Number(value))}
                          </span>
                        </div>
                      );
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="close"
                type="monotone"
                fill="url(#fillClosePrice)"
                stroke="var(--color-close)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
