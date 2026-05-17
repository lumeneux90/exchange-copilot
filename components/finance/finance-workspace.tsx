"use client";

import * as React from "react";
import { RiTimeLine } from "@remixicon/react";
import { toast } from "sonner";

import { formatAssetAmount } from "@/components/finance/finance-formatters";
import { OrderForm } from "@/components/finance/order-form";
import { OrderBook, RecentTrades } from "@/components/finance/order-book";
import { OrdersTable } from "@/components/finance/orders-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

function getRemainingAmount(order: FinancialOrderItem) {
  return Math.max(0, order.amount - order.filledAmount);
}

function getBestPrices(orders: FinancialOrderItem[]) {
  const bids = orders
    .filter((order) => order.side === "BUY" && getRemainingAmount(order) > 0)
    .map((order) => order.price);
  const asks = orders
    .filter((order) => order.side === "SELL" && getRemainingAmount(order) > 0)
    .map((order) => order.price);

  return {
    ask: asks.length ? Math.min(...asks) : null,
    bid: bids.length ? Math.max(...bids) : null,
  };
}

function PairStrip({
  isPending,
  onPairChange,
  pairs,
  selectedPair,
}: {
  isPending: boolean;
  onPairChange: (symbol: string) => void;
  pairs: FinancialMarketPairItem[];
  selectedPair: FinancialMarketPairItem;
}) {
  return (
    <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
      {pairs.map((pair) => (
        <button
          key={pair.id}
          type="button"
          className={cn(
            "grid min-w-28 rounded-md border px-3 py-2 text-left transition-colors",
            pair.id === selectedPair.id
              ? "border-primary bg-primary/10 text-foreground"
              : "bg-background hover:bg-muted/60"
          )}
          disabled={isPending}
          onClick={() => onPairChange(pair.symbol)}
        >
          <span className="text-sm font-semibold">{pair.label}</span>
          <span className="text-muted-foreground text-xs">
            {pair.baseAsset}/{pair.quoteAsset}
          </span>
        </button>
      ))}
    </div>
  );
}

function PairSummary({
  orders,
  pair,
  tradesCount,
}: {
  orders: FinancialOrderItem[];
  pair: FinancialMarketPairItem;
  tradesCount: number;
}) {
  const { ask, bid } = getBestPrices(orders);
  const mid = ask != null && bid != null ? (ask + bid) / 2 : null;
  const spread = ask != null && bid != null ? Math.max(0, ask - bid) : null;

  return (
    <div className="grid gap-3 border-b px-4 py-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-semibold tracking-normal">
          {pair.label}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-4 text-xs md:flex md:items-center">
        <div>
          <div className="text-muted-foreground">Средняя</div>
          <div className="font-semibold tabular-nums">
            {mid != null ? formatAssetAmount(mid, pair.quoteAsset) : "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Спред</div>
          <div className="font-semibold tabular-nums">
            {spread != null ? formatAssetAmount(spread, pair.quoteAsset) : "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Сделки</div>
          <div className="font-semibold tabular-nums">{tradesCount}</div>
        </div>
      </div>
    </div>
  );
}

function TradeTape({ trades }: { trades: FinanceState["trades"] }) {
  return (
    <div className="grid gap-2">
      {trades.length ? (
        trades.slice(0, HISTORY_PAGE_SIZE).map((trade) => (
          <div
            key={trade.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border px-3 py-2 text-xs"
          >
            <Badge variant={trade.side === "buy" ? "default" : "outline"}>
              {trade.side === "buy" ? "Покупка" : "Продажа"}
            </Badge>
            <div className="min-w-0">
              <div className="truncate font-medium">
                {formatAssetAmount(trade.amount, trade.asset)}
              </div>
              <div className="text-muted-foreground truncate">
                {formatAssetAmount(trade.quoteAmount, trade.quoteAsset)}
              </div>
            </div>
            <div
              className={cn(
                "text-right font-semibold tabular-nums",
                trade.side === "buy" ? "text-emerald-600" : "text-red-600"
              )}
            >
              {formatAssetAmount(trade.price, trade.quoteAsset)}
            </div>
          </div>
        ))
      ) : (
        <div className="text-muted-foreground bg-muted/45 rounded-md px-2 py-6 text-center text-xs">
          Сделок пока нет
        </div>
      )}
    </div>
  );
}

export function FinanceWorkspace({ finance }: { finance: FinanceState }) {
  const [localFinance, setLocalFinance] = React.useState(finance);
  const [isPairPending, startPairTransition] = React.useTransition();

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

  function handlePairChange(symbol: string) {
    if (symbol === localFinance.selectedPairSymbol) {
      return;
    }

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
      <PairStrip
        isPending={isPairPending}
        onPairChange={handlePairChange}
        pairs={localFinance.marketPairs}
        selectedPair={selectedPair}
      />

      <section className="bg-background min-w-0 overflow-hidden rounded-lg border">
        <PairSummary
          orders={openOrders}
          pair={selectedPair}
          tradesCount={localFinance.trades.length}
        />

        <div className="grid min-w-0 gap-0 xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
          <div className="min-w-0 border-b p-3 xl:border-r xl:border-b-0">
            <div className="mb-2 text-sm font-semibold">Стакан</div>
            <OrderBook orders={openOrders} pair={selectedPair} />
          </div>

          <div className="grid min-w-0 content-start gap-3 border-b p-3 xl:border-r xl:border-b-0">
            <div className="bg-muted/25 min-h-72 rounded-md border p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Глубина</div>
                  <div className="text-muted-foreground text-xs">
                    Рыночная глубина по {selectedPair.label}
                  </div>
                </div>
                <Badge variant="outline">Лимитный стакан</Badge>
              </div>
              <div className="text-muted-foreground grid min-h-52 place-items-center rounded-md border border-dashed text-center text-xs">
                График глубины и свечи подключим следующим слоем
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <OrderForm
                key={`${selectedPair.id}-buy`}
                fixedSide="BUY"
                onFinanceChange={setLocalFinance}
                pair={selectedPair}
              />
              <OrderForm
                key={`${selectedPair.id}-sell`}
                fixedSide="SELL"
                onFinanceChange={setLocalFinance}
                pair={selectedPair}
              />
            </div>
          </div>

          <div className="min-w-0 p-3">
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
              <TabsTrigger value="trades">История сделок</TabsTrigger>
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
          <TabsContent value="trades" className="mt-3">
            <TradeTape trades={localFinance.trades} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
