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
import { getErrorMessage } from "@/src/lib/errors";
import {
  formatSignedPercent,
  parseDecimalInput,
  rubFormatter,
} from "@/src/lib/money";

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
  const [quantity, setQuantity] = React.useState("1");
  const [fee, setFee] = React.useState("0");

  const parsedQuantity = parseDecimalInput(quantity);
  const parsedFee = parseDecimalInput(fee);
  const currentPrice = stock?.price ?? 0;
  const grossAmount = parsedQuantity * currentPrice;
  const buyTotalAmount = grossAmount + parsedFee;
  const sellNetAmount = Math.max(0, grossAmount - parsedFee);
  const marketStatus = getStockMarketStatus();
  const isStockMarketOpen = marketStatus.isOpen;
  const triggerDisabledReason = !isStockMarketOpen
    ? marketStatus.reason
    : currentPrice <= 0
      ? "Сделка недоступна, пока по бумаге нет актуальной цены."
      : null;
  const isTriggerDisabled = Boolean(triggerDisabledReason) || isPending;
  const canBuy = currentPrice > 0 && parsedQuantity > 0;
  const canSell =
    currentPrice > 0 &&
    parsedQuantity > 0 &&
    parsedQuantity <= (selectedHolding?.quantity ?? 0);

  React.useEffect(() => {
    if (!open) {
      setQuantity("1");
      setFee("0");
    }
  }, [open, stock?.ticker]);

  async function handleTrade(side: "buy" | "sell") {
    if (!stock) {
      return;
    }

    try {
      await tradeStock({
        ticker: stock.ticker,
        side,
        quantity: parsedQuantity,
        price: currentPrice,
        fee: parsedFee,
      });
      setOpen(false);
      setQuantity("1");
      setFee("0");
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
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Сделка по {stock.ticker}</SheetTitle>
          <SheetDescription>
            {stock.name}. Текущая цена: {rubFormatter.format(stock.price)} за 1
            бумагу.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 px-6">
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
                  ? `${selectedHolding.quantity} шт.`
                  : "Нет позиции"}
              </div>
            </div>
          </div>

          <Separator />

          <Tabs defaultValue="buy" className="gap-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy">Купить</TabsTrigger>
              <TabsTrigger value="sell">Продать</TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buy-quantity">Количество</Label>
                <Input
                  id="buy-quantity"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buy-fee">Комиссия, RUB</Label>
                <Input
                  id="buy-fee"
                  inputMode="decimal"
                  value={fee}
                  onChange={(event) => setFee(event.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2 rounded-lg border border-dashed p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Цена за бумагу</span>
                  <span>{rubFormatter.format(currentPrice)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Сумма без комиссии</span>
                  <span>{rubFormatter.format(grossAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Комиссия</span>
                  <span>{rubFormatter.format(parsedFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Итого к списанию</span>
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
              <SheetFooter className="px-0 pb-0">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button
                  disabled={!canBuy || !isStockMarketOpen || isPending}
                  onClick={() => void handleTrade("buy")}
                >
                  <RiWallet3Line />
                  Купить {parsedQuantity > 0 ? `${parsedQuantity} шт.` : ""}
                </Button>
              </SheetFooter>
            </TabsContent>

            <TabsContent value="sell" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sell-quantity">Количество</Label>
                <Input
                  id="sell-quantity"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sell-fee">Комиссия, RUB</Label>
                <Input
                  id="sell-fee"
                  inputMode="decimal"
                  value={fee}
                  onChange={(event) => setFee(event.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2 rounded-lg border border-dashed p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Доступно к продаже
                  </span>
                  <span>
                    {selectedHolding
                      ? `${selectedHolding.quantity} шт.`
                      : "0 шт."}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Сумма без комиссии</span>
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
              <div className="text-muted-foreground rounded-lg border p-3 text-sm">
                Продажа использует текущую позицию и сразу обновляет остаток
                портфеля в базе данных.
              </div>
              {!isStockMarketOpen ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {marketStatus.reason}
                </div>
              ) : null}
              <SheetFooter className="px-0 pb-0">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button
                  variant="destructive"
                  disabled={!canSell || !isStockMarketOpen || isPending}
                  onClick={() => void handleTrade("sell")}
                >
                  Продать {parsedQuantity > 0 ? `${parsedQuantity} шт.` : ""}
                </Button>
              </SheetFooter>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
