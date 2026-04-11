"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  RiArrowDownLine,
  RiExchangeFundsLine,
  RiArrowUpDownLine,
  RiStarLine,
  RiStarFill,
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
import { CompanyLogo } from "@/components/company-logo";
import { TradeOrderSheet } from "@/components/trade-order-sheet";
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
import { useWatchlist } from "@/src/features/watchlist/model/watchlist-context";

type CandleRequestState = "loading" | "success" | "error";

export function ChartAreaInteractive({ stocks }: { stocks: Stock[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isInWatchlist, tickers, toggleTicker } = useWatchlist();
  const requestedTicker = searchParams.get("ticker")?.trim().toUpperCase() ?? "";
  const [selectedTicker, setSelectedTicker] = React.useState(
    stocks[0]?.ticker ?? ""
  );
  const [range, setRange] = React.useState<CandleRange>("day");
  const [isTickerOpen, setIsTickerOpen] = React.useState(false);
  const [candles, setCandles] = React.useState<CandleResponseItem[]>([]);
  const [requestState, setRequestState] = React.useState<CandleRequestState>(
    selectedTicker ? "loading" : "success"
  );
  const lastAppliedRequestedTicker = React.useRef("");

  const updateTickerQuery = React.useCallback(
    (ticker: string) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (ticker) {
        nextParams.set("ticker", ticker);
      } else {
        nextParams.delete("ticker");
      }

      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  React.useEffect(() => {
    if (!stocks.length) {
      return;
    }

    const requestedStock = requestedTicker
      ? stocks.find((stock) => stock.ticker === requestedTicker)
      : null;

    if (
      requestedStock &&
      requestedStock.ticker !== lastAppliedRequestedTicker.current
    ) {
      lastAppliedRequestedTicker.current = requestedStock.ticker;
      setSelectedTicker(requestedStock.ticker);
      return;
    }

    if (!selectedTicker) {
      setSelectedTicker(stocks[0].ticker);
    }
  }, [requestedTicker, selectedTicker, stocks]);

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
  const orderedStocks = React.useMemo(() => {
    if (!tickers.length) {
      return stocks;
    }

    const watchlistSet = new Set(tickers);
    const watchlistStocks = stocks.filter((stock) => watchlistSet.has(stock.ticker));
    const otherStocks = stocks.filter((stock) => !watchlistSet.has(stock.ticker));

    return [...watchlistStocks, ...otherStocks];
  }, [stocks, tickers]);
  const watchlistStocks = React.useMemo(
    () => orderedStocks.filter((stock) => tickers.includes(stock.ticker)),
    [orderedStocks, tickers]
  );
  const otherStocks = React.useMemo(
    () => orderedStocks.filter((stock) => !tickers.includes(stock.ticker)),
    [orderedStocks, tickers]
  );

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
      <CardHeader className="items-center gap-3 border-b pb-2">
        <div className="flex min-w-0 items-center gap-3 self-center">
          {selectedStock ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-muted-foreground hover:text-foreground size-7 shrink-0 bg-transparent shadow-none",
                isInWatchlist(selectedStock.ticker) &&
                  "text-amber-500 hover:text-amber-500"
              )}
              aria-label={
                isInWatchlist(selectedStock.ticker)
                  ? `Убрать ${selectedStock.ticker} из watchlist`
                  : `Добавить ${selectedStock.ticker} в watchlist`
              }
              onClick={() => toggleTicker(selectedStock.ticker)}
            >
              {isInWatchlist(selectedStock.ticker) ? (
                <RiStarFill className="size-5" />
              ) : (
                <RiStarLine className="size-5" />
              )}
            </Button>
          ) : null}
          {selectedStock ? (
            <CompanyLogo
              ticker={selectedStock.ticker}
              name={selectedStock.name}
              className="size-9 rounded-lg"
            />
          ) : null}
          <div className="min-w-0">
            <CardTitle className="text-base leading-none font-medium">
              {selectedStock.name}
            </CardTitle>
            <div className="text-muted-foreground mt-1 truncate text-sm">
              {selectedStock ? `${selectedStock.ticker}` : "Выберите тикер"}
            </div>
          </div>
        </div>
        <CardAction className="col-start-1 row-start-2 w-full self-center justify-self-stretch @[920px]/card:col-start-2 @[920px]/card:row-start-1 @[920px]/card:w-auto">
          <div className="flex flex-col gap-3 @[920px]/card:items-end">
            <div className="flex w-full flex-col gap-3 @[920px]/card:w-auto @[920px]/card:flex-row @[920px]/card:items-center @[920px]/card:justify-end">
              <Popover open={isTickerOpen} onOpenChange={setIsTickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-8 w-full justify-between @[920px]/card:w-[26rem]"
                    />
                  }
                >
                  <span className="truncate">
                    {selectedStock
                      ? `${selectedStock.ticker} · ${selectedStock.name}`
                      : "Выбрать компанию"}
                  </span>
                  <RiArrowUpDownLine data-icon="inline-end" />
                </PopoverTrigger>
                <PopoverContent className="w-[26rem] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Найти тикер или компанию" />
                    <CommandList>
                      <CommandEmpty>Ничего не найдено</CommandEmpty>
                      {watchlistStocks.length > 0 ? (
                        <CommandGroup heading="Watchlist">
                          {watchlistStocks.map((stock) => (
                            <CommandItem
                              key={stock.ticker}
                              value={`${stock.ticker} ${stock.name}`}
                              keywords={[stock.ticker, stock.name]}
                              onSelect={() => {
                                React.startTransition(() => {
                                  setSelectedTicker(stock.ticker);
                                  updateTickerQuery(stock.ticker);
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
                                <div className="flex min-w-0 items-center gap-3">
                                  <CompanyLogo
                                    ticker={stock.ticker}
                                    name={stock.name}
                                    className="size-7 rounded-md"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-medium">
                                      {stock.ticker}
                                    </div>
                                    <div className="text-muted-foreground truncate text-xs">
                                      {stock.name}
                                    </div>
                                  </div>
                                </div>
                                <RiStarFill className="text-amber-500" />
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : null}
                      <CommandGroup heading={watchlistStocks.length ? "Все тикеры" : "Тикеры"}>
                        {otherStocks.map((stock) => (
                          <CommandItem
                            key={stock.ticker}
                            value={`${stock.ticker} ${stock.name}`}
                            keywords={[stock.ticker, stock.name]}
                            onSelect={() => {
                              React.startTransition(() => {
                                setSelectedTicker(stock.ticker);
                                updateTickerQuery(stock.ticker);
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
                              <div className="flex min-w-0 items-center gap-3">
                                <CompanyLogo
                                  ticker={stock.ticker}
                                  name={stock.name}
                                  className="size-7 rounded-md"
                                />
                                <div className="min-w-0">
                                  <div className="font-medium">
                                    {stock.ticker}
                                  </div>
                                  <div className="text-muted-foreground truncate text-xs">
                                    {stock.name}
                                  </div>
                                </div>
                              </div>
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
                  <ToggleGroupItem
                    key={key}
                    value={key}
                    className="aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:aria-pressed:bg-primary/90 hover:data-[state=on]:bg-primary/90"
                  >
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <TradeOrderSheet
                stock={selectedStock}
                triggerClassName="h-8 shrink-0 text-sm"
              />
            </div>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5 px-4 pt-4 sm:px-6">
        <ChartSummaryCards
          range={range}
          latestPrice={latestCandle?.close ?? null}
          periodOpenPrice={firstCandle?.open ?? null}
          rangeChange={rangeChange}
          totalVolume={candles.length ? totalVolume : null}
        />

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
                          <span className="text-muted-foreground block leading-none">
                            Цена
                          </span>
                          <span className="block text-right font-mono leading-none tabular-nums">
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
