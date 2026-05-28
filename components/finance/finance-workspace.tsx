"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { RiTimeLine } from "@remixicon/react";
import { toast } from "sonner";

import { formatAssetAmount } from "@/components/finance/finance-formatters";
import { AssetIcon } from "@/components/finance/asset-icon";
import {
  getOrderBookPrices,
  OrderBook,
  RecentTrades,
} from "@/components/finance/order-book";
import { OrdersTable } from "@/components/finance/orders-table";
import { SpotOrderPanel } from "@/components/finance/spot-order-panel";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFinancePairStateAction } from "@/src/features/finance/model/actions";
import type {
  FinancePairState,
  FinanceState,
  FinancialMarketPairItem,
  FinancialOrderItem,
} from "@/src/features/finance/model/types";
import { getErrorMessage } from "@/src/lib/errors";
import { cn } from "@/src/lib/utils";

const HISTORY_PAGE_SIZE = 8;

const pairIconUrls: Partial<Record<string, string>> = {
  "USD/RUB": "flag-overlap",
};

function PairIcon({
  className,
  pair,
}: {
  className?: string;
  pair: FinancialMarketPairItem;
}) {
  const iconUrl = pairIconUrls[pair.symbol];

  if (iconUrl === "flag-overlap") {
    return (
      <span
        className={cn("relative block size-9 shrink-0", className)}
        aria-hidden
      >
        <span className="ring-background absolute top-0 left-0 block size-[70%] overflow-hidden rounded-full ring-2">
          <Image
            src="/flags/us-round.svg"
            alt=""
            fill
            sizes="32px"
            className="object-cover"
            unoptimized
          />
        </span>
        <span className="ring-background absolute right-0 bottom-0 block size-[70%] overflow-hidden rounded-full ring-2">
          <Image
            src="/flags/ru-round.svg"
            alt=""
            fill
            sizes="32px"
            className="object-cover"
            unoptimized
          />
        </span>
      </span>
    );
  }

  if (iconUrl) {
    return (
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center overflow-hidden rounded-full",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Small local decorative SVG icons do not need Next image optimization. */}
        <img src={iconUrl} alt="" className="size-full" loading="lazy" />
      </span>
    );
  }

  return (
    <AssetIcon
      asset={pair.baseAsset === "USD" ? pair.quoteAsset : pair.baseAsset}
      className={className}
    />
  );
}

function PairCarousel({
  mid,
  onPairChange,
  pairs,
  selectedPair,
}: {
  mid: number | null;
  onPairChange: (symbol: string) => void;
  pairs: FinancialMarketPairItem[];
  selectedPair: FinancialMarketPairItem;
}) {
  return (
    <Carousel opts={{ align: "start" }} className="min-w-0">
      <CarouselContent className="-ml-2">
        {pairs.map((pair) => {
          const isSelected = pair.id === selectedPair.id;

          return (
            <CarouselItem
              key={pair.id}
              className="basis-[46%] pl-2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5"
            >
              <button
                type="button"
                className={cn(
                  "flex w-full min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "bg-background hover:bg-muted/60"
                )}
                onClick={() => onPairChange(pair.symbol)}
              >
                <PairIcon pair={pair} className="size-8" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {pair.symbol}
                  </div>
                  <div className="text-muted-foreground truncate text-xs tabular-nums">
                    {isSelected && mid != null
                      ? formatAssetAmount(mid, pair.quoteAsset)
                      : pair.quoteAsset}
                  </div>
                </div>
              </button>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <div className="mt-2 flex justify-end gap-2">
        <CarouselPrevious className="static translate-none" />
        <CarouselNext className="static translate-none" />
      </div>
    </Carousel>
  );
}

function PairStats({
  orders,
  pair,
  tradesCount,
}: {
  orders: FinancialOrderItem[];
  pair: FinancialMarketPairItem;
  tradesCount: number;
}) {
  const { ask, bid, mid } = getOrderBookPrices(orders);
  const spread = ask != null && bid != null ? Math.max(0, ask - bid) : null;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2 text-xs">
      <div className="text-foreground mr-auto text-sm font-semibold">
        {pair.symbol}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span>Средняя</span>
        <span className="text-foreground font-semibold tabular-nums">
          {mid != null ? formatAssetAmount(mid, pair.quoteAsset) : "—"}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span>Спред</span>
        <span className="text-foreground font-semibold tabular-nums">
          {spread != null ? formatAssetAmount(spread, pair.quoteAsset) : "—"}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span>Сделки</span>
        <span className="text-foreground font-semibold tabular-nums">
          {tradesCount}
        </span>
      </div>
    </div>
  );
}

export function FinanceWorkspace({ finance }: { finance: FinanceState }) {
  const [localFinance, setLocalFinance] = React.useState(finance);
  const [selectedPairSymbol, setSelectedPairSymbol] = React.useState(
    finance.selectedPairSymbol
  );
  const [pairStateCache, setPairStateCache] = React.useState(
    () =>
      new Map<string, FinancePairState>([
        [
          finance.selectedPairSymbol,
          {
            orders: finance.orders,
            selectedPairSymbol: finance.selectedPairSymbol,
            trades: finance.trades,
          },
        ],
      ])
  );
  const [selectedPrice, setSelectedPrice] = React.useState<number | null>(null);
  const pairRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    setLocalFinance(finance);
    setSelectedPairSymbol(finance.selectedPairSymbol);
    setPairStateCache(
      new Map([
        [
          finance.selectedPairSymbol,
          {
            orders: finance.orders,
            selectedPairSymbol: finance.selectedPairSymbol,
            trades: finance.trades,
          },
        ],
      ])
    );
  }, [finance]);

  React.useEffect(() => {
    setPairStateCache((currentCache) => {
      const nextCache = new Map(currentCache);

      nextCache.set(localFinance.selectedPairSymbol, {
        orders: localFinance.orders,
        selectedPairSymbol: localFinance.selectedPairSymbol,
        trades: localFinance.trades,
      });

      return nextCache;
    });
  }, [
    localFinance.orders,
    localFinance.selectedPairSymbol,
    localFinance.trades,
  ]);

  function cachePairState(pairState: FinancePairState) {
    setPairStateCache((currentCache) => {
      const nextCache = new Map(currentCache);

      nextCache.set(pairState.selectedPairSymbol, pairState);

      return nextCache;
    });
  }

  const selectedPair =
    localFinance.marketPairs.find(
      (pair) => pair.symbol === selectedPairSymbol
    ) ?? localFinance.marketPairs[0];
  const selectedPairState =
    localFinance.selectedPairSymbol === selectedPairSymbol
      ? {
          orders: localFinance.orders,
          selectedPairSymbol: localFinance.selectedPairSymbol,
          trades: localFinance.trades,
        }
      : (pairStateCache.get(selectedPairSymbol) ?? {
          orders: [],
          selectedPairSymbol,
          trades: [],
        });
  const openOrders = selectedPairState.orders.filter(
    (order) => order.status === "OPEN" || order.status === "PARTIALLY_FILLED"
  );
  const ownOpenOrders = openOrders.filter((order) => order.relation === "own");
  const historyOrders = selectedPairState.orders.filter(
    (order) =>
      order.relation === "own" &&
      order.status !== "OPEN" &&
      order.status !== "PARTIALLY_FILLED"
  );
  const marketPrices = getOrderBookPrices(openOrders);

  function handlePairChange(symbol: string) {
    if (symbol === selectedPairSymbol) {
      return;
    }

    const previousPairSymbol = selectedPairSymbol;
    const requestId = pairRequestIdRef.current + 1;

    pairRequestIdRef.current = requestId;
    flushSync(() => {
      setSelectedPrice(null);
      setSelectedPairSymbol(symbol);
    });

    window.setTimeout(() => {
      void loadPairState(symbol, requestId, previousPairSymbol);
    }, 0);
  }

  async function loadPairState(
    symbol: string,
    requestId: number,
    previousPairSymbol: string
  ) {
    try {
      const pairState = await getFinancePairStateAction(symbol);

      cachePairState(pairState);

      if (pairRequestIdRef.current !== requestId) {
        return;
      }

      setLocalFinance((currentFinance) => ({
        ...currentFinance,
        ...pairState,
      }));
    } catch (error) {
      if (pairRequestIdRef.current === requestId) {
        setSelectedPairSymbol(previousPairSymbol);
      }

      toast.error(getErrorMessage(error, "Не удалось сменить пару."));
    }
  }

  function handleFinanceChange(nextFinance: FinanceState) {
    cachePairState({
      orders: nextFinance.orders,
      selectedPairSymbol: nextFinance.selectedPairSymbol,
      trades: nextFinance.trades,
    });
    setSelectedPairSymbol(nextFinance.selectedPairSymbol);
    setLocalFinance(nextFinance);
  }

  const trades = selectedPairState.trades;

  if (!selectedPair) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardContent className="text-muted-foreground py-8 text-sm">
            Торговые пары пока не настроены.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-3 px-4 lg:px-6">
      <section className="bg-background min-w-0 overflow-hidden rounded-lg border">
        <div className="border-b px-4 py-3">
          <PairCarousel
            mid={marketPrices.mid}
            onPairChange={handlePairChange}
            pairs={localFinance.marketPairs}
            selectedPair={selectedPair}
          />
        </div>
        <PairStats
          orders={openOrders}
          pair={selectedPair}
          tradesCount={trades.length}
        />

        <div className="grid min-w-0 gap-0 xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
          <div className="order-2 min-w-0 border-b p-3 xl:order-none xl:border-r xl:border-b-0">
            <div className="mb-1 text-sm font-semibold">Стакан</div>
            <p className="text-muted-foreground mb-2 text-xs">
              Клик по строке подставит её цену в заявку.
            </p>
            <OrderBook
              onPriceSelect={setSelectedPrice}
              orders={openOrders}
              pair={selectedPair}
            />
          </div>

          <div className="order-1 min-w-0 border-b p-3 xl:order-none xl:border-r xl:border-b-0">
            <SpotOrderPanel
              accounts={localFinance.accounts}
              marketPrices={marketPrices}
              onFinanceChange={handleFinanceChange}
              pair={selectedPair}
              selectedPrice={selectedPrice}
            />
          </div>

          <div className="order-3 min-w-0 p-3 xl:order-none">
            <div className="mb-2 text-sm font-semibold">Сделки рынка</div>
            <RecentTrades pair={selectedPair} trades={trades} />
          </div>
        </div>
      </section>

      <section className="bg-background min-w-0 rounded-lg border p-3">
        <Tabs defaultValue="open">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <TabsList variant="line">
              <TabsTrigger value="open">Открытые заявки</TabsTrigger>
              <TabsTrigger value="history">История заявок</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="open" className="mt-3">
            <OrdersTable
              emptyTitle="Открытых заявок нет"
              onFinanceChange={handleFinanceChange}
              orders={ownOpenOrders}
            />
          </TabsContent>
          <TabsContent value="history" className="mt-3">
            <OrdersTable
              emptyIcon={<RiTimeLine />}
              emptyTitle="История пуста"
              orders={historyOrders}
              pageSize={HISTORY_PAGE_SIZE}
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
