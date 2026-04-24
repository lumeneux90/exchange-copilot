"use client";

import * as React from "react";
import { RiExchangeDollarLine } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CurrencyFlag } from "@/components/currency-flag";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrencyLabel } from "@/src/entities/market/model/currencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import { calculateFxTradeFee } from "@/src/features/portfolio/model/fx-trade-fees";
import {
  buildPortfolioSnapshot,
  usePortfolio,
} from "@/src/features/portfolio/model/portfolio-context";
import { getErrorMessage } from "@/src/lib/errors";
import { parseDecimalInput, rubFormatter } from "@/src/lib/money";

function formatFxAmount(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getAmountLabel(side: "buy" | "sell", code: string) {
  return side === "buy" ? "Сумма, RUB" : `Количество, ${code}`;
}

export function SidebarFxTradeCard({
  currencyRates,
}: {
  currencyRates: CurrencyRate[];
}) {
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
  const hasRates = availableCodes.length > 0;

  React.useEffect(() => {
    if (!availableCodes.includes(selectedCode)) {
      setSelectedCode(availableCodes[0] ?? "");
    }
  }, [availableCodes, selectedCode]);

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

  React.useEffect(() => {
    setAmount(side === "buy" ? "10000" : "100");
  }, [side, selectedCode]);

  async function handleSubmit() {
    if (!selectedRate || !canTrade) {
      return;
    }

    try {
      await tradeCurrency({
        amount: parsedAmount,
        code: selectedCode,
        quotedRate: selectedRate.price,
        side,
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
    <SidebarGroup>
      <SidebarGroupLabel>Валютные пары</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="bg-sidebar-accent/30 grid gap-3 rounded-xl border px-3 py-3">
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

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sidebar-fx-currency">Валюта</Label>
              <Select
                value={selectedCode}
                onValueChange={(value) =>
                  setSelectedCode(value ?? availableCodes[0] ?? "")
                }
                disabled={!hasRates}
              >
                <SelectTrigger id="sidebar-fx-currency" className="w-full">
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
                            {getCurrencyLabel(code)}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sidebar-fx-amount">
                {getAmountLabel(side, selectedCode)}
              </Label>
              <Input
                id="sidebar-fx-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={side === "buy" ? "10000" : "100"}
                disabled={!hasRates}
              />
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-dashed px-3 py-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Курс</span>
              <span>
                {selectedRate
                  ? rubFormatter.format(selectedRate.price)
                  : "Нет данных"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {side === "buy" ? "Сумма без комиссии" : "Сумма продажи"}
              </span>
              <span>{selectedRate ? rubFormatter.format(rubValue) : "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Комиссия</span>
              <span>{rubFormatter.format(parsedFee)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
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
            <div className="flex items-center justify-between gap-3">
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
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
