"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiExchangeDollarLine,
} from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CurrencyFlag } from "@/components/currency-flag";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import { calculateFxTradeFee } from "@/src/features/portfolio/model/fx-trade-fees";
import {
  buildPortfolioSnapshot,
  usePortfolio,
} from "@/src/features/portfolio/model/portfolio-context";
import { getErrorMessage } from "@/src/lib/errors";
import { parseDecimalInput, rubFormatter } from "@/src/lib/money";
import { cn } from "@/src/lib/utils";

const currencyLabelMap: Record<string, string> = {
  USD: "Доллар США",
  EUR: "Евро",
  CNY: "Китайский юань",
  GBP: "Фунт стерлингов",
  HKD: "Гонконгский доллар",
  AED: "Дирхам ОАЭ",
};

function formatFxAmount(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 4,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function getAmountLabel(side: "buy" | "sell", code: string) {
  return side === "buy" ? "Сумма, RUB" : `Количество, ${code}`;
}

function getTrendTone(value: number) {
  if (value > 0) {
    return "text-primary";
  }

  if (value < 0) {
    return "text-destructive";
  }

  return "text-muted-foreground";
}

export function FxTradePanel({
  currencyRates,
  className,
}: {
  currencyRates: CurrencyRate[];
  className?: string;
}) {
  const router = useRouter();
  const { isPending, portfolio, tradeCurrency } = usePortfolio();
  const snapshot = buildPortfolioSnapshot(portfolio, [], currencyRates);
  const availableCodes = React.useMemo(
    () =>
      currencyRates
        .map((rate) => rate.label.split("/")[0] ?? rate.code)
        .filter(Boolean),
    [currencyRates]
  );
  const [side, setSide] = React.useState<"buy" | "sell">("buy");
  const [selectedCode, setSelectedCode] = React.useState(
    availableCodes[0] ?? ""
  );
  const [amount, setAmount] = React.useState("10000");
  const [isTradeOpen, setIsTradeOpen] = React.useState(false);
  const hasRates = availableCodes.length > 0;

  React.useEffect(() => {
    if (!availableCodes.includes(selectedCode)) {
      setSelectedCode(availableCodes[0] ?? "");
    }
  }, [availableCodes, selectedCode]);

  React.useEffect(() => {
    setAmount(side === "buy" ? "10000" : "100");
  }, [side, selectedCode]);

  const parsedAmount = parseDecimalInput(amount);
  const selectedRate = currencyRates.find(
    (rate) => (rate.label.split("/")[0] ?? rate.code) === selectedCode
  );
  const currentBalance = snapshot.currencies.find(
    (currency) => currency.code === selectedCode
  );
  const fxQuantity =
    selectedRate && parsedAmount > 0
      ? side === "buy"
        ? parsedAmount / selectedRate.price
        : parsedAmount
      : 0;
  const rubValue =
    selectedRate && parsedAmount > 0
      ? side === "buy"
        ? parsedAmount
        : parsedAmount * selectedRate.price
      : 0;
  const parsedFee = calculateFxTradeFee(rubValue);
  const buyTotalCost = rubValue + parsedFee;
  const rawSellNetAmount = rubValue - parsedFee;
  const sellNetAmount = Math.max(0, rawSellNetAmount);
  const canTrade =
    Boolean(selectedRate) &&
    parsedAmount > 0 &&
    (side === "buy"
      ? buyTotalCost <= snapshot.cashBalance
      : fxQuantity <= (currentBalance?.quantity ?? 0) && rawSellNetAmount >= 0);
  const disabledReason = !selectedRate
    ? "Курсы валют временно недоступны. Попробуйте позже."
    : parsedAmount <= 0
      ? side === "buy"
        ? "Введите сумму покупки в RUB."
        : `Введите количество ${selectedCode} для продажи.`
      : side === "buy" && buyTotalCost > snapshot.cashBalance
        ? "Недостаточно рублей на балансе."
        : side === "sell" && rawSellNetAmount < 0
          ? "Комиссия не может быть больше суммы сделки."
          : side === "sell" && fxQuantity > (currentBalance?.quantity ?? 0)
            ? `Недостаточно ${selectedCode} на балансе.`
            : null;

  async function handleSubmit() {
    if (!selectedRate || !canTrade) {
      return;
    }

    try {
      await tradeCurrency({
        amount: parsedAmount,
        code: selectedCode,
        side,
        rate: selectedRate.price,
      });
      setAmount(side === "buy" ? "10000" : "100");
      toast.success(
        side === "buy"
          ? `${selectedCode} куплена в портфель.`
          : `${selectedCode} продана из портфеля.`
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Не удалось выполнить валютную сделку.")
      );
    }
  }

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="grid gap-2 xl:grid-cols-2">
        {currencyRates.slice(0, 6).map((item) => {
          const directionClass = getTrendTone(item.changePercent);

          return (
            <button
              key={item.code}
              type="button"
              className="hover:bg-accent/40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors"
              onClick={() => router.push(`/chart?fx=${item.code}`)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <CurrencyFlag code={item.code} className="size-8" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-muted-foreground text-xs">
                    {currencyLabelMap[item.code] ?? item.code}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium tabular-nums">
                  {rubFormatter.format(item.price)}
                </div>
                <div
                  className={cn("text-xs font-medium tabular-nums", directionClass)}
                >
                  {formatPercent(item.changePercent)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Collapsible
        open={isTradeOpen}
        onOpenChange={setIsTradeOpen}
        className={cn(
          "rounded-xl border p-1 transition-colors",
          isTradeOpen ? "bg-muted/60" : "bg-transparent"
        )}
      >
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start rounded-md px-3 py-3 text-left"
            >
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="text-sm font-medium">Быстрый обмен</span>
                <span className="text-muted-foreground text-xs">
                  Откройте форму для покупки или продажи валюты
                </span>
              </div>
              {isTradeOpen ? (
                <RiArrowUpSLine data-icon="inline-end" />
              ) : (
                <RiArrowDownSLine data-icon="inline-end" />
              )}
            </Button>
          }
        />

        <CollapsibleContent className="grid gap-3 px-3 pt-1 pb-3">
          <Tabs
            value={side}
            onValueChange={(value) =>
              setSide((value as "buy" | "sell") ?? "buy")
            }
            className="gap-3"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy">Купить</TabsTrigger>
              <TabsTrigger value="sell">Продать</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="fx-card-currency">Валюта</Label>
              <Select
                value={selectedCode}
                onValueChange={(value) =>
                  setSelectedCode(value ?? availableCodes[0] ?? "")
                }
                disabled={!hasRates}
              >
                <SelectTrigger id="fx-card-currency" className="w-full">
                  <SelectValue placeholder="Курсы загружаются">
                    {selectedCode ? (
                      <div className="flex items-center gap-2">
                        <CurrencyFlag code={selectedCode} className="size-5" />
                        <span>{selectedCode}</span>
                      </div>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  {availableCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      <div className="flex items-center gap-2">
                        <CurrencyFlag code={code} className="size-5" />
                        <div className="flex min-w-0 flex-col">
                          <span className="font-medium">{code}</span>
                          <span className="text-muted-foreground text-[11px]">
                            {currencyLabelMap[code] ?? code}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fx-card-amount">
                {getAmountLabel(side, selectedCode)}
              </Label>
              <Input
                id="fx-card-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={side === "buy" ? "10000" : "100"}
                disabled={!hasRates}
              />
            </div>
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">Курс</span>
              <span>
                {selectedRate ? rubFormatter.format(selectedRate.price) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">Комиссия</span>
              <span>{rubFormatter.format(parsedFee)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">
                {side === "buy" ? "Будет куплено" : "Поступит на счет"}
              </span>
              <span>
                {selectedRate
                  ? side === "buy"
                    ? `${formatFxAmount(fxQuantity)} ${selectedCode}`
                    : rubFormatter.format(sellNetAmount)
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">В наличии</span>
              <span>
                {currentBalance
                  ? `${formatFxAmount(currentBalance.quantity)} ${selectedCode}`
                  : `0 ${selectedCode}`}
              </span>
            </div>
          </div>

          <Button
            onClick={() => void handleSubmit()}
            disabled={!canTrade || isPending}
            title={disabledReason ?? undefined}
          >
            <RiExchangeDollarLine />
            {selectedCode
              ? side === "buy"
                ? `Купить ${selectedCode}`
                : `Продать ${selectedCode}`
              : "Обмен недоступен"}
          </Button>
          {disabledReason ? (
            <div className="text-muted-foreground text-xs">
              {disabledReason}
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
