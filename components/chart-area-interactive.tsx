"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  XAxis,
  YAxis,
} from "recharts";
import {
  RiArrowDownLine,
  RiExchangeFundsLine,
  RiArrowUpDownLine,
  RiStarLine,
  RiStarFill,
} from "@remixicon/react";

import { CurrencyFlag } from "@/components/currency-flag";
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
  getXAxisTicks,
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { useIsMobile } from "@/hooks/use-mobile";
import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import {
  FX_INSTRUMENTS,
  getFxInstrumentByCode,
} from "@/src/entities/market/model/fx-instruments";
import { cn } from "@/src/lib/utils";
import { useWatchlist } from "@/src/features/watchlist/model/watchlist-context";

type CandleRequestState = "loading" | "success" | "error";

type ChartAreaInteractiveProps = {
  stocks: Stock[];
  currencyRates: CurrencyRate[];
};

type InstrumentSelection =
  | { type: "stock"; ticker: string }
  | { type: "fx"; code: string };

function getCurrencyLabel(code: string) {
  return (
    FX_INSTRUMENTS.find((instrument) => instrument.code === code)?.label ?? code
  );
}

export function ChartAreaInteractive({
  stocks,
  currencyRates,
}: ChartAreaInteractiveProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { isInWatchlist, tickers, toggleTicker } = useWatchlist();
  const requestedTicker = searchParams.get("ticker")?.trim().toUpperCase() ?? "";
  const requestedFxCode = searchParams.get("fx")?.trim().toUpperCase() ?? "";
  const [selection, setSelection] = React.useState<InstrumentSelection>(() => {
    if (requestedFxCode && getFxInstrumentByCode(requestedFxCode)) {
      return { type: "fx", code: requestedFxCode };
    }

    return { type: "stock", ticker: stocks[0]?.ticker ?? "" };
  });
  const [range, setRange] = React.useState<CandleRange>("day");
  const [isTickerOpen, setIsTickerOpen] = React.useState(false);
  const [candles, setCandles] = React.useState<CandleResponseItem[]>([]);
  const [requestState, setRequestState] = React.useState<CandleRequestState>(
    selection.type === "stock"
      ? selection.ticker
        ? "loading"
        : "success"
      : selection.code
        ? "loading"
        : "success"
  );
  const lastAppliedSelection = React.useRef("");
  const selectedTicker = selection.type === "stock" ? selection.ticker : "";
  const selectedFxCode = selection.type === "fx" ? selection.code : "";

  const updateTickerQuery = React.useCallback(
    (nextSelection: InstrumentSelection) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (nextSelection.type === "stock" && nextSelection.ticker) {
        nextParams.set("ticker", nextSelection.ticker);
        nextParams.delete("fx");
      }

      if (nextSelection.type === "fx" && nextSelection.code) {
        nextParams.set("fx", nextSelection.code);
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
    const requestedFx = requestedFxCode
      ? getFxInstrumentByCode(requestedFxCode)
      : null;

    if (requestedFx) {
      const nextKey = `fx:${requestedFx.code}`;

      if (nextKey !== lastAppliedSelection.current) {
        lastAppliedSelection.current = nextKey;
        setSelection({ type: "fx", code: requestedFx.code });
      }

      return;
    }

    const requestedStock = requestedTicker
      ? stocks.find((stock) => stock.ticker === requestedTicker)
      : null;

    if (requestedStock) {
      const nextKey = `stock:${requestedStock.ticker}`;

      if (nextKey !== lastAppliedSelection.current) {
        lastAppliedSelection.current = nextKey;
        setSelection({ type: "stock", ticker: requestedStock.ticker });
      }

      return;
    }

    if (!stocks.length) {
      return;
    }

    if (selection.type !== "stock" || !selection.ticker) {
      setSelection({ type: "stock", ticker: stocks[0].ticker });
    }
  }, [requestedFxCode, requestedTicker, selection, stocks]);

  React.useEffect(() => {
    if (selection.type === "fx" && range === "day") {
      setRange("week");
    }
  }, [range, selection.type]);

  React.useEffect(() => {
    let isCancelled = false;

    async function loadCandles() {
      if (
        (selection.type === "stock" && !selection.ticker) ||
        (selection.type === "fx" && !selection.code)
      ) {
        setCandles([]);
        setRequestState("success");
        return;
      }

      setRequestState("loading");

      try {
        const requestQuery =
          selection.type === "stock"
            ? `ticker=${selection.ticker}`
            : `fx=${selection.code}`;
        const response = await fetch(
          `/api/candles?${requestQuery}&range=${range}`
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
  }, [range, selection]);

  const selectedStock =
    stocks.find((stock) => stock.ticker === selectedTicker) ??
    stocks[0] ??
    null;
  const selectedCurrencyRate =
    currencyRates.find((rate) => rate.code === selectedFxCode) ?? null;
  const selectedFxInstrument = selectedFxCode
    ? getFxInstrumentByCode(selectedFxCode) ?? null
    : null;
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

  const chartData = React.useMemo(
    () => buildChartData(candles, range),
    [candles, range]
  );

  const latestCandle = candles.at(-1);
  const firstCandle = candles[0];
  const rangeChange = getRangeChange(candles);
  const totalVolume = React.useMemo(() => getTotalVolume(candles), [candles]);
  const chartDomain = React.useMemo(
    () => getChartDomain(chartData),
    [chartData]
  );
  const chartExtremums = React.useMemo(() => {
    if (!chartData.length) {
      return { highest: null, lowest: null };
    }

    const highestIndex = chartData.reduce(
      (bestIndex, point, index, points) =>
        point.close > points[bestIndex].close ? index : bestIndex,
      0
    );
    const lowestIndex = chartData.reduce(
      (bestIndex, point, index, points) =>
        point.close < points[bestIndex].close ? index : bestIndex,
      0
    );

    return {
      highest: {
        index: highestIndex,
        point: chartData[highestIndex],
      },
      lowest: {
        index: lowestIndex,
        point: chartData[lowestIndex],
      },
    };
  }, [chartData]);
  const xAxisTicks = React.useMemo(
    () => getXAxisTicks(chartData, range),
    [chartData, range]
  );
  const showLoadingState = requestState === "loading";
  const showErrorState = requestState === "error";
  const showEmptyState = requestState === "success" && !chartData.length;
  const isFxInstrument = selection.type === "fx";
  const availableRanges = React.useMemo(
    () =>
      isFxInstrument
        ? (["week", "month", "year", "all"] as CandleRange[])
        : (["day", "week", "month", "year", "all"] as CandleRange[]),
    [isFxInstrument]
  );
  const chartMargin = React.useMemo(
    () =>
      isMobile
        ? { top: 20, right: 8, bottom: 20, left: 8 }
        : { top: 24, right: 12, bottom: 24, left: 12 },
    [isMobile]
  );
  const xAxisPadding = React.useMemo(
    () => (isMobile ? { left: 0, right: 0 } : { left: 4, right: 4 }),
    [isMobile]
  );
  const tickerSelectorTrigger = (
    <Button
      variant="outline"
      className="h-8 w-full justify-between @[920px]/card:w-[26rem]"
    >
      <span className="truncate">
        {isFxInstrument
          ? selectedFxInstrument
            ? `${selectedFxInstrument.label} · Валютная пара`
            : "Выбрать инструмент"
          : selectedStock
            ? `${selectedStock.ticker} · ${selectedStock.name}`
            : "Выбрать инструмент"}
      </span>
      <RiArrowUpDownLine data-icon="inline-end" />
    </Button>
  );
  const tickerSelectorContent = (
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
                    const nextSelection = {
                      type: "stock",
                      ticker: stock.ticker,
                    } as const;

                    setSelection(nextSelection);
                    updateTickerQuery(nextSelection);
                    setIsTickerOpen(false);
                  });
                }}
              >
                <RiCheckLine
                  className={cn(
                    selectedTicker === stock.ticker ? "opacity-100" : "opacity-0"
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
                      <div className="font-medium">{stock.ticker}</div>
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
                  const nextSelection = {
                    type: "stock",
                    ticker: stock.ticker,
                  } as const;

                  setSelection(nextSelection);
                  updateTickerQuery(nextSelection);
                  setIsTickerOpen(false);
                });
              }}
            >
              <RiCheckLine
                className={cn(
                  selectedTicker === stock.ticker ? "opacity-100" : "opacity-0"
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
                    <div className="font-medium">{stock.ticker}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {stock.name}
                    </div>
                  </div>
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Валюты">
          {currencyRates.map((rate) => (
            <CommandItem
              key={rate.code}
              value={`${rate.code} ${rate.label} валюта`}
              keywords={[rate.code, rate.label]}
              onSelect={() => {
                React.startTransition(() => {
                  const nextSelection = {
                    type: "fx",
                    code: rate.code,
                  } as const;

                  setSelection(nextSelection);
                  updateTickerQuery(nextSelection);
                  setIsTickerOpen(false);
                });
              }}
            >
              <RiCheckLine
                className={cn(
                  selectedFxCode === rate.code ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CurrencyFlag code={rate.code} className="size-7 rounded-md" />
                  <div className="min-w-0">
                    <div className="font-medium">{rate.label}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      Официальный курс ЦБ
                    </div>
                  </div>
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  return (
    <Card className="@container/card">
      <CardHeader className="items-center gap-3 border-b pb-2">
        <div className="flex min-w-0 items-center gap-3 self-center">
          {!isFxInstrument && selectedStock ? (
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
          {isFxInstrument && selectedFxCode ? (
            <CurrencyFlag code={selectedFxCode} className="size-9 rounded-lg" />
          ) : null}
          {!isFxInstrument && selectedStock ? (
            <CompanyLogo
              ticker={selectedStock.ticker}
              name={selectedStock.name}
              className="size-9 rounded-lg"
            />
          ) : null}
          <div className="min-w-0">
            <CardTitle className="text-base leading-none font-medium">
              {isFxInstrument
                ? selectedFxInstrument?.label ?? "Валютная пара"
                : selectedStock?.name ?? "Инструмент"}
            </CardTitle>
            <div className="text-muted-foreground mt-1 truncate text-sm">
              {isFxInstrument
                ? selectedCurrencyRate
                  ? `${selectedCurrencyRate.code} · официальный курс ЦБ`
                  : `${selectedFxCode} · официальный курс ЦБ`
                : selectedStock
                  ? `${selectedStock.ticker}`
                  : "Выберите инструмент"}
            </div>
          </div>
        </div>
        <CardAction className="col-start-1 row-start-2 w-full self-center justify-self-stretch @[920px]/card:col-start-2 @[920px]/card:row-start-1 @[920px]/card:w-auto">
          <div className="flex flex-col gap-3 @[920px]/card:items-end">
            <div className="flex w-full flex-col gap-3 @[920px]/card:w-auto @[920px]/card:flex-row @[920px]/card:items-center @[920px]/card:justify-end">
              {isMobile ? (
                <Drawer open={isTickerOpen} onOpenChange={setIsTickerOpen}>
                  <Button
                    variant="outline"
                    className="h-8 w-full justify-between @[920px]/card:w-[26rem]"
                    onClick={() => setIsTickerOpen(true)}
                  >
                    <span className="truncate">
                      {isFxInstrument
                        ? selectedFxInstrument
                          ? `${selectedFxInstrument.label} · Валютная пара`
                          : "Выбрать инструмент"
                        : selectedStock
                          ? `${selectedStock.ticker} · ${selectedStock.name}`
                          : "Выбрать инструмент"}
                    </span>
                    <RiArrowUpDownLine data-icon="inline-end" />
                  </Button>
                  <DrawerContent className="p-0">
                    <DrawerHeader className="px-4 pb-2 text-left">
                      <DrawerTitle>Выбрать инструмент</DrawerTitle>
                    </DrawerHeader>
                    <div className="px-2 pb-2">{tickerSelectorContent}</div>
                  </DrawerContent>
                </Drawer>
              ) : (
                <Popover open={isTickerOpen} onOpenChange={setIsTickerOpen}>
                  <PopoverTrigger render={tickerSelectorTrigger} />
                  <PopoverContent className="w-[26rem] p-0" align="end">
                    {tickerSelectorContent}
                  </PopoverContent>
                </Popover>
              )}
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
                {availableRanges.map((key) => (
                  <ToggleGroupItem
                    key={key}
                    value={key}
                    className="aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:aria-pressed:bg-primary/90 hover:data-[state=on]:bg-primary/90"
                  >
                    {rangeLabels[key]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {!isFxInstrument && selectedStock ? (
                <TradeOrderSheet
                  stock={selectedStock}
                  triggerClassName="h-8 shrink-0 text-sm"
                />
              ) : null}
            </div>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5 px-4 pt-4 sm:px-6">
        <ChartSummaryCards
          range={range}
          latestPrice={latestCandle?.close ?? null}
          periodOpenPrice={firstCandle?.open ?? null}
          latestPriceLabel={isFxInstrument ? "Курс ЦБ" : undefined}
          periodOpenLabel={isFxInstrument ? "На начало периода" : undefined}
          rangeChange={rangeChange}
          totalVolume={candles.length ? totalVolume : null}
          detailLabel={isFxInstrument ? "Источник" : undefined}
          detailValue={isFxInstrument ? "Официальный курс ЦБ" : undefined}
        />

        {showLoadingState ? (
          <div className="text-muted-foreground flex h-[320px] w-full flex-col items-center justify-center gap-3 text-sm">
            <Spinner className="size-5" />
            <span>
              Загружаем{" "}
              {isFxInstrument ? "динамику курса ЦБ по " : "историю по "}
              {isFxInstrument ? getCurrencyLabel(selectedFxCode) : selectedTicker}
              ...
            </span>
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
                  {isFxInstrument
                    ? "Не получилось получить историю официального курса ЦБ."
                    : "Не получилось получить историю выбранного инструмента."}
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
                  {isFxInstrument
                    ? "Для выбранной валюты ЦБ не вернул значения за этот период."
                    : "Для выбранного инструмента и периода MOEX не вернул свечи."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[320px] w-full"
          >
            <AreaChart
              data={chartData}
              margin={chartMargin}
            >
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
                ticks={xAxisTicks}
                tickLine={false}
                axisLine={false}
                padding={xAxisPadding}
                minTickGap={28}
                tickFormatter={(value) => formatAxisLabel(String(value), range)}
              />
              <YAxis
                hide
                tickLine={false}
                axisLine={false}
                domain={chartDomain}
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
              {chartExtremums.highest ? (
                <ReferenceDot
                  x={chartExtremums.highest.point.label}
                  y={chartExtremums.highest.point.close}
                  r={3}
                  ifOverflow="extendDomain"
                  fill="var(--color-close)"
                  stroke="var(--background)"
                  strokeWidth={1.5}
                  label={{
                    value: formatPrice(chartExtremums.highest.point.close),
                    position: "top",
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                    offset: 10,
                  }}
                />
              ) : null}
              {chartExtremums.lowest &&
              chartExtremums.lowest.point.label !==
                chartExtremums.highest?.point.label ? (
                <ReferenceDot
                  x={chartExtremums.lowest.point.label}
                  y={chartExtremums.lowest.point.close}
                  r={3}
                  ifOverflow="extendDomain"
                  fill="var(--color-close)"
                  stroke="var(--background)"
                  strokeWidth={1.5}
                  label={{
                    value: formatPrice(chartExtremums.lowest.point.close),
                    position: "bottom",
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                    offset: 10,
                  }}
                />
              ) : null}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
