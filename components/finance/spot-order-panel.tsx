"use client";

import * as React from "react";
import { toast } from "sonner";

import { formatAssetAmount } from "@/components/finance/finance-formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createFinancialOrderAction } from "@/src/features/finance/model/actions";
import { notifyFinanceRefresh } from "@/src/features/finance/model/finance-context";
import type {
  FinanceState,
  FinancialAccountItem,
  FinancialMarketPairItem,
  FinancialOrderSide,
} from "@/src/features/finance/model/types";
import { getErrorMessage } from "@/src/lib/errors";
import { parseDecimalInput } from "@/src/lib/money";
import { cn } from "@/src/lib/utils";

function formatEditableDecimal(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(value);
}

function getAvailableBalance(
  accounts: FinancialAccountItem[],
  asset: FinancialMarketPairItem["baseAsset"]
) {
  return accounts.find((account) => account.asset === asset)?.balance ?? 0;
}

export function SpotOrderPanel({
  accounts,
  marketPrices,
  onFinanceChange,
  pair,
  selectedPrice = null,
}: {
  accounts: FinancialAccountItem[];
  marketPrices: {
    ask: number | null;
    bid: number | null;
    mid: number | null;
  };
  onFinanceChange: (finance: FinanceState) => void;
  pair: FinancialMarketPairItem;
  selectedPrice?: number | null;
}) {
  const [side, setSide] = React.useState<FinancialOrderSide>("BUY");
  const [amount, setAmount] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const parsedAmount = parseDecimalInput(amount);
  const parsedPrice = parseDecimalInput(price);
  const isValid = parsedAmount > 0 && parsedPrice > 0;
  const lockAsset = side === "BUY" ? pair.quoteAsset : pair.baseAsset;
  const availableBalance = getAvailableBalance(accounts, lockAsset);
  const totalQuote =
    parsedAmount > 0 && parsedPrice > 0 ? parsedAmount * parsedPrice : 0;

  React.useEffect(() => {
    setAmount("");
    setPrice("");
    setSide("BUY");
  }, [pair.id]);

  React.useEffect(() => {
    if (selectedPrice == null || selectedPrice <= 0) {
      return;
    }

    setPrice(formatEditableDecimal(selectedPrice, pair.pricePrecision));
  }, [pair.pricePrecision, selectedPrice]);

  function applyMarketPrice(nextPrice: number | null) {
    if (nextPrice == null || nextPrice <= 0) {
      return;
    }

    setPrice(formatEditableDecimal(nextPrice, pair.pricePrecision));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValid) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await createFinancialOrderAction({
          amount: parsedAmount,
          pairSymbol: pair.symbol,
          price: parsedPrice,
          side,
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success("Ордер создан.");
        onFinanceChange(result.finance);
        setAmount("");
        setPrice("");
        notifyFinanceRefresh(result.finance);
      } catch (error) {
        toast.error(getErrorMessage(error, "Не удалось создать ордер."));
      }
    });
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3">
        <CardTitle>Заявка</CardTitle>
        <div className="rounded-lg border px-3 py-2">
          <div className="text-muted-foreground text-xs">Доступно</div>
          <div className="mt-1 text-sm font-semibold tabular-nums">
            {formatAssetAmount(availableBalance, lockAsset)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={side}
          onValueChange={(value) => setSide((value ?? "BUY") as FinancialOrderSide)}
          className="gap-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="BUY"
              className="data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"
            >
              Купить
            </TabsTrigger>
            <TabsTrigger
              value="SELL"
              className="data-active:bg-destructive/10 data-active:text-destructive hover:data-active:bg-destructive/20 dark:data-active:bg-destructive/20 dark:hover:data-active:bg-destructive/30 data-active:border-transparent"
            >
              Продать
            </TabsTrigger>
          </TabsList>

          <TabsContent value="BUY" className="flex flex-col gap-4">
            <OrderFormFields
              amount={amount}
              isPending={isPending}
              isValid={isValid}
              marketPrices={marketPrices}
              onApplyMarketPrice={applyMarketPrice}
              onAmountChange={setAmount}
              onPriceChange={setPrice}
              onSubmit={handleSubmit}
              pair={pair}
              parsedAmount={parsedAmount}
              parsedPrice={parsedPrice}
              price={price}
              side="BUY"
              totalQuote={totalQuote}
            />
          </TabsContent>

          <TabsContent value="SELL" className="flex flex-col gap-4">
            <OrderFormFields
              amount={amount}
              isPending={isPending}
              isValid={isValid}
              marketPrices={marketPrices}
              onApplyMarketPrice={applyMarketPrice}
              onAmountChange={setAmount}
              onPriceChange={setPrice}
              onSubmit={handleSubmit}
              pair={pair}
              parsedAmount={parsedAmount}
              parsedPrice={parsedPrice}
              price={price}
              side="SELL"
              totalQuote={totalQuote}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function OrderFormFields({
  amount,
  isPending,
  isValid,
  marketPrices,
  onApplyMarketPrice,
  onAmountChange,
  onPriceChange,
  onSubmit,
  pair,
  parsedAmount,
  parsedPrice,
  price,
  side,
  totalQuote,
}: {
  amount: string;
  isPending: boolean;
  isValid: boolean;
  marketPrices: {
    ask: number | null;
    bid: number | null;
    mid: number | null;
  };
  onApplyMarketPrice: (price: number | null) => void;
  onAmountChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  pair: FinancialMarketPairItem;
  parsedAmount: number;
  parsedPrice: number;
  price: string;
  side: FinancialOrderSide;
  totalQuote: number;
}) {
  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={amount.length > 0 && parsedAmount <= 0}>
          <FieldLabel htmlFor={`spot-order-amount-${side}`}>
            Количество, {pair.baseAsset}
          </FieldLabel>
          <Input
            id={`spot-order-amount-${side}`}
            inputMode="decimal"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="0.00"
            aria-invalid={amount.length > 0 && parsedAmount <= 0}
          />
        </Field>

        <Field data-invalid={price.length > 0 && parsedPrice <= 0}>
          <FieldLabel htmlFor={`spot-order-price-${side}`}>
            Цена, {pair.quoteAsset}
          </FieldLabel>
          <Input
            id={`spot-order-price-${side}`}
            inputMode="decimal"
            value={price}
            onChange={(event) => onPriceChange(event.target.value)}
            placeholder="0.00"
            aria-invalid={price.length > 0 && parsedPrice <= 0}
          />
          <FieldDescription>
            За 1 {pair.baseAsset}. Кнопки подставляют лучший уровень стакана,
            клик по строке — цену именно этого уровня.
          </FieldDescription>
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={marketPrices.bid == null}
            title="Лучший спрос — максимальная цена покупки в стакане"
            onClick={() => onApplyMarketPrice(marketPrices.bid)}
          >
            Спрос
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={marketPrices.mid == null}
            title="Средняя между лучшим спросом и лучшим предложением"
            onClick={() => onApplyMarketPrice(marketPrices.mid)}
          >
            Средняя
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={marketPrices.ask == null}
            title="Лучшее предложение — минимальная цена продажи в стакане"
            onClick={() => onApplyMarketPrice(marketPrices.ask)}
          >
            Предложение
          </Button>
        </div>

        <div className="rounded-lg border px-3 py-2 text-sm">
          <div className="text-muted-foreground text-xs">Итого</div>
          <div className="mt-1 font-semibold tabular-nums">
            {totalQuote > 0
              ? formatAssetAmount(totalQuote, pair.quoteAsset)
              : "—"}
          </div>
        </div>

        <Button
          type="submit"
          disabled={!isValid || isPending}
          variant={side === "BUY" ? "default" : "destructive"}
          className={cn(side === "SELL" && "bg-destructive hover:bg-destructive/90")}
        >
          {side === "BUY"
            ? `Купить ${pair.baseAsset}`
            : `Продать ${pair.baseAsset}`}
        </Button>
      </FieldGroup>
    </form>
  );
}
