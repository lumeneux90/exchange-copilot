"use client";

import {
  formatAssetAmount,
  formatOrderDate,
} from "@/components/finance/finance-formatters";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type {
  FinanceAsset,
  FinancialMarketPairItem,
  FinancialOrderItem,
  FinancialTradeItem,
} from "@/src/features/finance/model/types";
import { cn } from "@/src/lib/utils";

const BOOK_DEPTH = 9;

type BookLevel = {
  amount: number;
  price: number;
  quoteAmount: number;
};

function getRemainingAmount(order: FinancialOrderItem) {
  return Math.max(0, order.amount - order.filledAmount);
}

function aggregateLevels(
  orders: FinancialOrderItem[],
  side: FinancialOrderItem["side"]
) {
  const levels = new Map<number, BookLevel>();

  for (const order of orders) {
    if (
      order.side !== side ||
      (order.status !== "OPEN" && order.status !== "PARTIALLY_FILLED")
    ) {
      continue;
    }

    const amount = getRemainingAmount(order);

    if (amount <= 0) {
      continue;
    }

    const level = levels.get(order.price) ?? {
      amount: 0,
      price: order.price,
      quoteAmount: 0,
    };

    level.amount += amount;
    level.quoteAmount += amount * order.price;
    levels.set(order.price, level);
  }

  return [...levels.values()].sort((left, right) =>
    side === "BUY" ? right.price - left.price : left.price - right.price
  );
}

function formatCompactAmount(amount: number, asset: FinanceAsset) {
  if (asset === "XCP") {
    return `${new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 2,
    }).format(amount)} XCP`;
  }

  return formatAssetAmount(amount, asset);
}

function OrderBookRows({
  levels,
  pair,
  side,
}: {
  levels: BookLevel[];
  pair: FinancialMarketPairItem;
  side: "BUY" | "SELL";
}) {
  const maxQuoteAmount = Math.max(
    1,
    ...levels.map((level) => level.quoteAmount)
  );

  return (
    <div className="grid gap-px">
      {levels.map((level) => {
        const depthPercent = Math.min(
          100,
          (level.quoteAmount / maxQuoteAmount) * 100
        );

        return (
          <div
            key={`${side}-${level.price}`}
            className="relative grid grid-cols-[1fr_1fr_1fr] overflow-hidden rounded-sm px-2 py-1 text-xs tabular-nums"
          >
            <div
              className={cn(
                "absolute inset-y-0 right-0 -z-10",
                side === "BUY" ? "bg-emerald-500/12" : "bg-red-500/12"
              )}
              style={{ width: `${depthPercent}%` }}
            />
            <span
              className={cn(
                "font-medium",
                side === "BUY" ? "text-emerald-600" : "text-red-600"
              )}
            >
              {formatAssetAmount(level.price, pair.quoteAsset)}
            </span>
            <span className="text-right">
              {formatCompactAmount(level.amount, pair.baseAsset)}
            </span>
            <span className="text-muted-foreground text-right">
              {formatAssetAmount(level.quoteAmount, pair.quoteAsset)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function OrderBook({
  orders,
  pair,
}: {
  orders: FinancialOrderItem[];
  pair: FinancialMarketPairItem;
}) {
  const asks = aggregateLevels(orders, "SELL").slice(0, BOOK_DEPTH).reverse();
  const bids = aggregateLevels(orders, "BUY").slice(0, BOOK_DEPTH);
  const bestAsk = asks.at(-1)?.price ?? null;
  const bestBid = bids.at(0)?.price ?? null;
  const spread =
    bestAsk != null && bestBid != null ? Math.max(0, bestAsk - bestBid) : null;

  return (
    <div className="grid min-w-0 gap-2">
      <div className="grid grid-cols-[1fr_1fr_1fr] px-2 text-[0.68rem] font-medium text-muted-foreground uppercase">
        <span>Цена</span>
        <span className="text-right">{pair.baseAsset}</span>
        <span className="text-right">{pair.quoteAsset}</span>
      </div>

      <OrderBookRows levels={asks} pair={pair} side="SELL" />

      <div className="grid grid-cols-[1fr_auto] items-center rounded-md bg-muted/55 px-2 py-2 text-xs">
        <span className="font-semibold tabular-nums">
          {bestBid != null && bestAsk != null
            ? formatAssetAmount((bestBid + bestAsk) / 2, pair.quoteAsset)
            : "Нет рынка"}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {spread != null
            ? `Спред ${formatAssetAmount(spread, pair.quoteAsset)}`
            : ""}
        </span>
      </div>

      <OrderBookRows levels={bids} pair={pair} side="BUY" />
    </div>
  );
}

export function RecentTrades({
  pair,
  trades,
}: {
  pair: FinancialMarketPairItem;
  trades: FinancialTradeItem[];
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <div className="grid grid-cols-[1fr_1fr_auto] px-2 text-[0.68rem] font-medium text-muted-foreground uppercase">
        <span>Цена</span>
        <span className="text-right">{pair.baseAsset}</span>
        <span className="text-right">Время</span>
      </div>
      {trades.length ? (
        trades.slice(0, 8).map((trade) => (
          <div
            key={trade.id}
            className="grid grid-cols-[1fr_1fr_auto] rounded-sm px-2 py-1 text-xs tabular-nums"
          >
            <span
              className={trade.side === "buy" ? "text-emerald-600" : "text-red-600"}
            >
              {formatAssetAmount(trade.price, trade.quoteAsset)}
            </span>
            <span className="text-right">
              {formatCompactAmount(trade.amount, trade.asset)}
            </span>
            <span className="text-muted-foreground text-right">
              {formatOrderDate(trade.executedAt)}
            </span>
          </div>
        ))
      ) : (
        <Empty className="min-h-32 border">
          <EmptyHeader>
            <EmptyTitle>Сделок пока нет</EmptyTitle>
            <EmptyDescription>
              Лента заполнится после первого исполнения в этой паре.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
