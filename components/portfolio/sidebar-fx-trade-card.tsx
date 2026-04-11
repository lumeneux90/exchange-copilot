"use client";

import * as React from "react";
import { RiExchangeDollarLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { CurrencyFlag } from "@/components/currency-flag";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  buildPortfolioSnapshot,
  usePortfolio,
} from "@/src/features/portfolio/model/portfolio-context";

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 2,
});

const FX_CODES = ["USD", "EUR", "CNY", "GBP", "HKD", "AED"] as const;
const currencyLabelMap: Record<string, string> = {
  USD: "Доллар США",
  EUR: "Евро",
  CNY: "Китайский юань",
  GBP: "Фунт стерлингов",
  HKD: "Гонконгский доллар",
  AED: "Дирхам ОАЭ",
};

function parseAmount(value: string) {
  const normalized = value.replace(",", ".").replace(/\s+/g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : 0;
}

function formatFxAmount(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 4,
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
      currencyRates.length
        ? currencyRates
            .map((rate) => rate.label.split("/")[0] ?? rate.code)
            .filter(Boolean)
        : [...FX_CODES],
    [currencyRates]
  );
  const [side, setSide] = React.useState<"buy" | "sell">("buy");
  const [selectedCode, setSelectedCode] = React.useState(
    availableCodes[0] ?? "USD"
  );
  const [amount, setAmount] = React.useState("10000");

  React.useEffect(() => {
    if (!availableCodes.includes(selectedCode)) {
      setSelectedCode(availableCodes[0] ?? "USD");
    }
  }, [availableCodes, selectedCode]);

  const parsedAmount = parseAmount(amount);
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
  const canTrade =
    Boolean(selectedRate) &&
    parsedAmount > 0 &&
    (side === "buy"
      ? rubValue <= snapshot.cashBalance
      : fxQuantity <= (currentBalance?.quantity ?? 0));

  React.useEffect(() => {
    setAmount(side === "buy" ? "10000" : "100");
  }, [side, selectedCode]);

  async function handleSubmit() {
    if (!selectedRate || !canTrade) {
      return;
    }

    const didTrade = tradeCurrency({
      amount: parsedAmount,
      code: selectedCode,
      side,
      rate: selectedRate.price,
    });

    if (await didTrade) {
      setAmount(side === "buy" ? "10000" : "100");
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
                  setSelectedCode(value ?? availableCodes[0] ?? "USD")
                }
              >
                <SelectTrigger id="sidebar-fx-currency" className="w-full">
                  <SelectValue placeholder="Выберите валюту">
                    <div className="flex items-center gap-2">
                      <CurrencyFlag code={selectedCode} className="size-5" />
                      <span>{selectedCode}</span>
                    </div>
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
              <Label htmlFor="sidebar-fx-amount">
                {getAmountLabel(side, selectedCode)}
              </Label>
              <Input
                id="sidebar-fx-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={side === "buy" ? "10000" : "100"}
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
                {side === "buy" ? "Будет куплено" : "Поступит на счет"}
              </span>
              <span>
                {selectedRate
                  ? side === "buy"
                    ? `${formatFxAmount(fxQuantity)} ${selectedCode}`
                    : rubFormatter.format(rubValue)
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

          <Button onClick={() => void handleSubmit()} disabled={!canTrade || isPending}>
            <RiExchangeDollarLine />
            {side === "buy"
              ? `Купить ${selectedCode}`
              : `Продать ${selectedCode}`}
          </Button>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
