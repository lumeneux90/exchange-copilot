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
  if (!["RUB", "USD"].includes(asset)) {
    return `${new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: asset === "BTC" ? 6 : asset === "ETH" ? 4 : 2,
    }).format(amount)} ${asset}`;
  }

  return formatAssetAmount(amount, asset);
}

function OrderBookRows({
  levels,
  onPriceSelect,
  pair,
  side,
}: {
  levels: BookLevel[];
  onPriceSelect?: (price: number) => void;
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
          <button
            key={`${side}-${level.price}`}
            type="button"
            className="hover:bg-accent/40 relative grid w-full grid-cols-[1fr_1fr_1fr] overflow-hidden rounded-sm px-2 py-1 text-left text-xs tabular-nums transition-colors"
            title={`Подставить цену ${formatAssetAmount(level.price, pair.quoteAsset)}`}
            aria-label={`Подставить цену ${formatAssetAmount(level.price, pair.quoteAsset)}`}
            onClick={() => onPriceSelect?.(level.price)}
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
          </button>
        );
      })}
    </div>
  );
}

export function getOrderBookPrices(orders: FinancialOrderItem[]) {
  const bids = orders
    .filter((order) => order.side === "BUY" && getRemainingAmount(order) > 0)
    .map((order) => order.price);
  const asks = orders
    .filter((order) => order.side === "SELL" && getRemainingAmount(order) > 0)
    .map((order) => order.price);
  const bid = bids.length ? Math.max(...bids) : null;
  const ask = asks.length ? Math.min(...asks) : null;

  return {
    ask,
    bid,
    mid: ask != null && bid != null ? (ask + bid) / 2 : null,
  };
}

export function OrderBook({
  onPriceSelect,
  orders,
  pair,
}: {
  onPriceSelect?: (price: number) => void;
  orders: FinancialOrderItem[];
  pair: FinancialMarketPairItem;
}) {
  const asks = aggregateLevels(orders, "SELL").slice(0, BOOK_DEPTH).reverse();
  const bids = aggregateLevels(orders, "BUY").slice(0, BOOK_DEPTH);
  const { ask: bestAsk, bid: bestBid, mid } = getOrderBookPrices(orders);
  const spread =
    bestAsk != null && bestBid != null ? Math.max(0, bestAsk - bestBid) : null;

  return (
    <div className="grid min-w-0 gap-2">
      <div className="text-muted-foreground grid grid-cols-[1fr_1fr_1fr] px-2 text-[0.68rem] font-medium uppercase">
        <span>Цена</span>
        <span className="text-right">{pair.baseAsset}</span>
        <span className="text-right">{pair.quoteAsset}</span>
      </div>

      <OrderBookRows
        levels={asks}
        onPriceSelect={onPriceSelect}
        pair={pair}
        side="SELL"
      />

      <button
        type="button"
        className={cn(
          "bg-muted/55 grid w-full grid-cols-[1fr_auto] items-center rounded-md px-2 py-2 text-left text-xs transition-colors",
          onPriceSelect && mid != null && "hover:bg-muted"
        )}
        disabled={!onPriceSelect || mid == null}
        title={
          mid != null
            ? "Подставить среднюю цену между лучшим спросом и предложением"
            : undefined
        }
        onClick={() => {
          if (mid != null) {
            onPriceSelect?.(mid);
          }
        }}
      >
        <span className="font-semibold tabular-nums">
          {mid != null
            ? formatAssetAmount(mid, pair.quoteAsset)
            : "Нет рынка"}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {spread != null
            ? `Спред ${formatAssetAmount(spread, pair.quoteAsset)}`
            : ""}
        </span>
      </button>

      <OrderBookRows
        levels={bids}
        onPriceSelect={onPriceSelect}
        pair={pair}
        side="BUY"
      />
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
      <div className="text-muted-foreground grid grid-cols-[1fr_1fr_auto] px-2 text-[0.68rem] font-medium uppercase">
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
              className={
                trade.side === "buy" ? "text-emerald-600" : "text-red-600"
              }
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
