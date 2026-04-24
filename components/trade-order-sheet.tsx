"use client";

import * as React from "react";
import { RiArrowLeftRightLine, RiWallet3Line } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Stock } from "@/src/entities/stock/model/types";
import {
  buildPortfolioSnapshot,
  usePortfolio,
} from "@/src/features/portfolio/model/portfolio-context";
import { getStockMarketStatus } from "@/src/features/portfolio/model/market-hours";
import { calculateStockTradeFee } from "@/src/features/portfolio/model/stock-trade-fees";
import { getErrorMessage } from "@/src/lib/errors";
import {
  formatSignedPercent,
  parseDecimalInput,
  rubFormatter,
} from "@/src/lib/money";

type TradeSide = "buy" | "sell";
type StockInputMode = "quantity" | "amount";

function normalizeShareQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

function formatStockQuantity(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(normalizeShareQuantity(value));
}

function formatEditableDecimal(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  return value.toFixed(maximumFractionDigits).replace(/\.?0+$/, "");
}

export function TradeOrderSheet({
  stock,
  open: openProp,
  onOpenChange,
  showTrigger = true,
  triggerLabel = "Совершить сделку",
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
}: {
  stock: Stock | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
}) {
  const { isPending, portfolio, tradeStock } = usePortfolio();
  const snapshot = buildPortfolioSnapshot(portfolio, stock ? [stock] : []);
  const selectedHolding =
    snapshot.holdings.find((holding) => holding.ticker === stock?.ticker) ??
    null;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [side, setSide] = React.useState<TradeSide>("buy");
  const [buyInputMode, setBuyInputMode] =
    React.useState<StockInputMode>("quantity");
  const [sellInputMode, setSellInputMode] =
    React.useState<StockInputMode>("quantity");
  const [quantity, setQuantity] = React.useState("1");
  const [amount, setAmount] = React.useState("1000");

  const inputMode = side === "buy" ? buyInputMode : sellInputMode;
  const parsedQuantityInput = parseDecimalInput(quantity);
  const parsedAmountInput = parseDecimalInput(amount);
  const currentPrice = stock?.price ?? 0;
  const parsedQuantity = normalizeShareQuantity(
    currentPrice > 0
      ? inputMode === "quantity"
        ? parsedQuantityInput
        : parsedAmountInput / currentPrice
      : 0
  );
  const grossAmount = parsedQuantity * currentPrice;
  const parsedFee = calculateStockTradeFee(grossAmount);
  const buyTotalAmount = grossAmount + parsedFee;
  const rawSellNetAmount = grossAmount - parsedFee;
  const sellNetAmount = Math.max(0, rawSellNetAmount);
  const marketStatus = getStockMarketStatus();
  const isStockMarketOpen = marketStatus.isOpen;
  const triggerDisabledReason = !isStockMarketOpen
    ? marketStatus.reason
    : currentPrice <= 0
      ? "Сделка недоступна, пока по бумаге нет актуальной цены."
      : null;
  const isTriggerDisabled = Boolean(triggerDisabledReason) || isPending;
  const canBuy =
    currentPrice > 0 &&
    parsedQuantity > 0 &&
    buyTotalAmount <= snapshot.cashBalance;
  const canSell =
    currentPrice > 0 &&
    parsedQuantity > 0 &&
    parsedQuantity <= (selectedHolding?.quantity ?? 0) &&
    rawSellNetAmount >= 0;

  function resetForm() {
    setSide("buy");
    setBuyInputMode("quantity");
    setSellInputMode("quantity");
    setQuantity("1");
    setAmount("1000");
  }

  function syncModeValue(nextMode: StockInputMode) {
    if (currentPrice <= 0) {
      return;
    }

    if (inputMode === nextMode) {
      return;
    }

    if (nextMode === "amount") {
      const normalizedQuantity = normalizeShareQuantity(parsedQuantityInput);
      setAmount(formatEditableDecimal(normalizedQuantity * currentPrice, 2));
      return;
    }

    setQuantity(
      String(normalizeShareQuantity(parsedAmountInput / currentPrice))
    );
  }

  function handleBuyInputModeChange(value: string) {
    const nextMode = (value as StockInputMode) ?? "quantity";
    syncModeValue(nextMode);
    setBuyInputMode(nextMode);
  }

  function handleSellInputModeChange(value: string) {
    const nextMode = (value as StockInputMode) ?? "quantity";
    syncModeValue(nextMode);
    setSellInputMode(nextMode);
  }

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  React.useEffect(() => {
    resetForm();
  }, [stock?.ticker]);

  async function handleTrade(side: TradeSide) {
    if (!stock) {
      return;
    }

    try {
      await tradeStock({
        ticker: stock.ticker,
        side,
        quantity: parsedQuantity,
        quotedPrice: currentPrice,
      });
      setOpen(false);
      resetForm();
      toast.success(
        side === "buy"
          ? `${stock.ticker} добавлена в портфель.`
          : `${stock.ticker} продана из портфеля.`
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Не удалось выполнить сделку по акции.")
      );
    }
  }

  if (!stock) {
    if (showTrigger) {
      return (
        <Button className="h-10 text-sm" disabled>
          <RiArrowLeftRightLine />
          {triggerLabel}
        </Button>
      );
    }

    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <SheetTrigger
          render={
            <Button
              variant={triggerVariant}
              size={triggerSize}
              className={triggerClassName}
              disabled={isTriggerDisabled}
              title={triggerDisabledReason ?? undefined}
            />
          }
        >
          <RiArrowLeftRightLine />
          {triggerLabel}
        </SheetTrigger>
      ) : null}
      <SheetContent side="right" className="h-[100dvh] sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Сделка по {stock.ticker}</SheetTitle>
          <SheetDescription>
            {stock.name}. Текущая цена: {rubFormatter.format(stock.price)} за 1
            бумагу.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">
                Свободный баланс
              </div>
              <div className="mt-1 text-sm font-semibold">
                {rubFormatter.format(snapshot.cashBalance)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">
                Всего в портфеле
              </div>
              <div className="mt-1 text-sm font-semibold">
                {selectedHolding
                  ? `${formatStockQuantity(selectedHolding.quantity)} шт.`
                  : "Нет позиции"}
              </div>
            </div>
          </div>

          <Separator />

          <Tabs
            value={side}
            onValueChange={(value) => setSide((value as TradeSide) ?? "buy")}
            className="gap-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="buy"
                className="data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"
              >
                Купить
              </TabsTrigger>
              <TabsTrigger
                value="sell"
                className="data-active:bg-destructive/10 data-active:text-destructive hover:data-active:bg-destructive/20 dark:data-active:bg-destructive/20 dark:hover:data-active:bg-destructive/30 data-active:border-transparent"
              >
                Продать
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="space-y-4 pb-2">
              <Tabs
                value={buyInputMode}
                onValueChange={handleBuyInputModeChange}
                className="gap-2"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="quantity">По количеству</TabsTrigger>
                  <TabsTrigger value="amount">По сумме</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="space-y-2">
                <Label htmlFor="buy-value">
                  {buyInputMode === "quantity"
                    ? "Количество"
                    : "Сумма сделки, RUB"}
                </Label>
                <Input
                  id="buy-value"
                  inputMode={
                    buyInputMode === "quantity" ? "numeric" : "decimal"
                  }
                  value={buyInputMode === "quantity" ? quantity : amount}
                  onChange={(event) =>
                    buyInputMode === "quantity"
                      ? setQuantity(event.target.value)
                      : setAmount(event.target.value)
                  }
                  placeholder={buyInputMode === "quantity" ? "1" : "1000"}
                />
              </div>
              <div className="grid gap-2 rounded-lg border border-dashed p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Количество бумаг
                  </span>
                  <span>
                    {parsedQuantity > 0
                      ? `${formatStockQuantity(parsedQuantity)} шт.`
                      : "0 шт."}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Цена за бумагу</span>
                  <span>{rubFormatter.format(currentPrice)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Сумма без комиссии
                  </span>
                  <span>{rubFormatter.format(grossAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Комиссия</span>
                  <span>{rubFormatter.format(parsedFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Итого к списанию
                  </span>
                  <span>{rubFormatter.format(buyTotalAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Остаток после покупки
                  </span>
                  <span>
                    {rubFormatter.format(snapshot.cashBalance - buyTotalAmount)}
                  </span>
                </div>
              </div>
              {!isStockMarketOpen ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {marketStatus.reason}
                </div>
              ) : null}
              <SheetFooter className="bg-popover sticky right-0 bottom-0 left-0 border-t px-0 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button
                  disabled={!canBuy || !isStockMarketOpen || isPending}
                  onClick={() => void handleTrade("buy")}
                >
                  <RiWallet3Line />
                  Купить{" "}
                  {parsedQuantity > 0
                    ? `${formatStockQuantity(parsedQuantity)} шт.`
                    : ""}
                </Button>
              </SheetFooter>
            </TabsContent>

            <TabsContent value="sell" className="space-y-4 pb-2">
              <Tabs
                value={sellInputMode}
                onValueChange={handleSellInputModeChange}
                className="gap-2"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="quantity">По количеству</TabsTrigger>
                  <TabsTrigger value="amount">По сумме</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="space-y-2">
                <Label htmlFor="sell-value">
                  {sellInputMode === "quantity"
                    ? "Количество"
                    : "Сумма сделки, RUB"}
                </Label>
                <Input
                  id="sell-value"
                  inputMode={
                    sellInputMode === "quantity" ? "numeric" : "decimal"
                  }
                  value={sellInputMode === "quantity" ? quantity : amount}
                  onChange={(event) =>
                    sellInputMode === "quantity"
                      ? setQuantity(event.target.value)
                      : setAmount(event.target.value)
                  }
                  placeholder={sellInputMode === "quantity" ? "1" : "1000"}
                />
              </div>
              <div className="grid gap-2 rounded-lg border border-dashed p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Доступно к продаже
                  </span>
                  <span>
                    {selectedHolding
                      ? `${formatStockQuantity(selectedHolding.quantity)} шт.`
                      : "0 шт."}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Будет продано</span>
                  <span>
                    {parsedQuantity > 0
                      ? `${formatStockQuantity(parsedQuantity)} шт.`
                      : "0 шт."}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Сумма без комиссии
                  </span>
                  <span>{rubFormatter.format(grossAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Комиссия</span>
                  <span>{rubFormatter.format(parsedFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Поступит на счет
                  </span>
                  <span>{rubFormatter.format(sellNetAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Результат позиции
                  </span>
                  <span>
                    {selectedHolding
                      ? formatSignedPercent(selectedHolding.profitLossPercent)
                      : "0.00%"}
                  </span>
                </div>
              </div>
              {!isStockMarketOpen ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {marketStatus.reason}
                </div>
              ) : null}
              <SheetFooter className="bg-popover sticky right-0 bottom-0 left-0 border-t px-0 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button
                  variant="destructive"
                  disabled={!canSell || !isStockMarketOpen || isPending}
                  onClick={() => void handleTrade("sell")}
                >
                  Продать{" "}
                  {parsedQuantity > 0
                    ? `${formatStockQuantity(parsedQuantity)} шт.`
                    : ""}
                </Button>
              </SheetFooter>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
