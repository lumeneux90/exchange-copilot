"use client";

import * as React from "react";
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
import { getFinanceStateAction } from "@/src/features/finance/model/actions";
import type {
  FinanceState,
  FinancialMarketPairItem,
  FinancialOrderItem,
} from "@/src/features/finance/model/types";
import { getErrorMessage } from "@/src/lib/errors";
import { cn } from "@/src/lib/utils";

const HISTORY_PAGE_SIZE = 8;

function PairCarousel({
  isPending,
  mid,
  onPairChange,
  pairs,
  selectedPair,
}: {
  isPending: boolean;
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
                disabled={isPending}
                onClick={() => onPairChange(pair.symbol)}
              >
                <AssetIcon
                  asset={
                    pair.baseAsset === "USD" ? pair.quoteAsset : pair.baseAsset
                  }
                  className="size-8"
                />
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
  const [isPairPending, startPairTransition] = React.useTransition();
  const [selectedPrice, setSelectedPrice] = React.useState<number | null>(null);

  React.useEffect(() => {
    setLocalFinance(finance);
  }, [finance]);

  const selectedPair =
    localFinance.marketPairs.find(
      (pair) => pair.symbol === localFinance.selectedPairSymbol
    ) ?? localFinance.marketPairs[0];
  const openOrders = localFinance.orders.filter(
    (order) => order.status === "OPEN" || order.status === "PARTIALLY_FILLED"
  );
  const ownOpenOrders = openOrders.filter((order) => order.relation === "own");
  const historyOrders = localFinance.orders.filter(
    (order) =>
      order.relation === "own" &&
      order.status !== "OPEN" &&
      order.status !== "PARTIALLY_FILLED"
  );
  const marketPrices = getOrderBookPrices(openOrders);

  function handlePairChange(symbol: string) {
    if (symbol === localFinance.selectedPairSymbol) {
      return;
    }

    setSelectedPrice(null);

    startPairTransition(async () => {
      try {
        setLocalFinance(await getFinanceStateAction(symbol));
      } catch (error) {
        toast.error(getErrorMessage(error, "Не удалось сменить пару."));
      }
    });
  }

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
            isPending={isPairPending}
            mid={marketPrices.mid}
            onPairChange={handlePairChange}
            pairs={localFinance.marketPairs}
            selectedPair={selectedPair}
          />
        </div>
        <PairStats
          orders={openOrders}
          pair={selectedPair}
          tradesCount={localFinance.trades.length}
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
              onFinanceChange={setLocalFinance}
              pair={selectedPair}
              selectedPrice={selectedPrice}
            />
          </div>

          <div className="order-3 min-w-0 p-3 xl:order-none">
            <div className="mb-2 text-sm font-semibold">Сделки рынка</div>
            <RecentTrades pair={selectedPair} trades={localFinance.trades} />
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
              onFinanceChange={setLocalFinance}
              orders={ownOpenOrders}
            />
          </TabsContent>
          <TabsContent value="history" className="mt-3">
            <OrdersTable
              emptyIcon={<RiTimeLine />}
              emptyTitle="История пуста"
              orders={historyOrders}
              pageSize={HISTORY_PAGE_SIZE}
              showActions={false}
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
