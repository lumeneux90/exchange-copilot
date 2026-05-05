"use client";

import * as React from "react";
import { RiBankCardLine, RiWallet3Line } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useFinance } from "@/src/features/finance/model/finance-context";
import { usePortfolio } from "@/src/features/portfolio/model/portfolio-context";
import type { PortfolioTransferCurrency } from "@/src/features/portfolio/model/types";
import { getErrorMessage } from "@/src/lib/errors";
import { parseDecimalInput } from "@/src/lib/money";

const transferCurrencyOptions: Array<{
  value: PortfolioTransferCurrency;
  label: string;
  defaultAmount: string;
}> = [
  { value: "RUB", label: "Рубли", defaultAmount: "10000" },
  { value: "USD", label: "Доллары", defaultAmount: "100" },
];

const transferCurrencyFormatters: Record<
  PortfolioTransferCurrency,
  Intl.NumberFormat
> = {
  RUB: new Intl.NumberFormat("ru-RU", {
    currency: "RUB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }),
  USD: new Intl.NumberFormat("ru-RU", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }),
};

function formatTransferAmount(
  amount: number,
  currency: PortfolioTransferCurrency
) {
  return transferCurrencyFormatters[currency].format(amount);
}

function getTransferCurrencyBalance(
  portfolioCurrencies: Array<{ code: string; quantity: number }>,
  currency: PortfolioTransferCurrency
) {
  return (
    portfolioCurrencies.find((balance) => balance.code === currency)
      ?.quantity ?? 0
  );
}

export function DepositFundsSheet({
  operation = "deposit",
  triggerLabel = "Пополнить счет",
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
  side = "right",
}: {
  operation?: "deposit" | "withdraw";
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const { finance } = useFinance();
  const { depositFunds, isPending, portfolio, withdrawFunds } = usePortfolio();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("10000");
  const [currency, setCurrency] =
    React.useState<PortfolioTransferCurrency>("RUB");
  const amountId = React.useId();
  const currencyId = React.useId();
  const amountHelpId = React.useId();

  const parsedAmount = parseDecimalInput(amount);
  const isDeposit = operation === "deposit";
  const availableAmount = isDeposit
    ? (finance.accounts.find((account) => account.asset === currency)
        ?.balance ?? 0)
    : currency === "RUB"
      ? portfolio.cashBalance
      : getTransferCurrencyBalance(portfolio.currencies, currency);
  const clampedSliderAmount = Math.min(
    Math.max(parsedAmount, 0),
    availableAmount
  );
  const sliderStep = currency === "RUB" && availableAmount > 100 ? 100 : 1;
  const isValidAmount =
    parsedAmount > 0 && parsedAmount <= availableAmount + Number.EPSILON;
  const selectedCurrencyOption =
    transferCurrencyOptions.find((option) => option.value === currency) ??
    transferCurrencyOptions[0];
  const actualTriggerLabel =
    triggerLabel === "Пополнить счет" && !isDeposit ? "Вывести" : triggerLabel;
  const helperText =
    "Переводы между финансовым и брокерским счетами осуществляются мгновенно.";
  const availableLabel = formatTransferAmount(availableAmount, currency);

  function handleCurrencyChange(value: string | null) {
    const nextCurrency =
      transferCurrencyOptions.find((option) => option.value === value) ??
      transferCurrencyOptions[0];

    setCurrency(nextCurrency.value);
    setAmount(nextCurrency.defaultAmount);
  }

  function handleSliderChange(value: number | readonly number[]) {
    const nextAmount = Array.isArray(value) ? value[0] : value;

    if (nextAmount == null) {
      return;
    }

    setAmount(String(nextAmount));
  }

  async function handleSubmit() {
    if (!isValidAmount) {
      return;
    }

    try {
      if (isDeposit) {
        await depositFunds(parsedAmount, currency);
      } else {
        await withdrawFunds(parsedAmount, currency);
      }
      setAmount(selectedCurrencyOption.defaultAmount);
      setOpen(false);
      toast.success(
        isDeposit
          ? "Брокерский счет пополнен."
          : "Средства выведены на финансовый счет."
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          isDeposit
            ? "Не удалось пополнить счет."
            : "Не удалось вывести средства."
        )
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
          />
        }
      >
        {isDeposit ? <RiWallet3Line /> : <RiBankCardLine />}
        {actualTriggerLabel}
      </SheetTrigger>
      <SheetContent
        side={side}
        className={
          side === "bottom" ? "max-h-[100dvh]" : "h-[100dvh] sm:max-w-md"
        }
      >
        <SheetHeader>
          <SheetTitle>
            {isDeposit ? "Пополнение брокерского счета" : "Вывод средств"}
          </SheetTitle>
          <SheetDescription>
            {isDeposit
              ? `Переведите ${currency} с финансового счета на брокерский счет.`
              : `Переведите свободные ${currency} с брокерского счета на финансовый счет.`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={currencyId}>Валюта</FieldLabel>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger id={currencyId} className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {transferCurrencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={amount.length > 0 && !isValidAmount}>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor={amountId}>
                  {isDeposit
                    ? `Сумма пополнения, ${currency}`
                    : `Сумма вывода, ${currency}`}
                </FieldLabel>
                <span className="text-muted-foreground shrink-0 text-xs">
                  Доступно: {availableLabel}
                </span>
              </div>
              <Input
                id={amountId}
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={selectedCurrencyOption.defaultAmount}
                maxLength={12}
                aria-describedby={amountHelpId}
                aria-invalid={amount.length > 0 && !isValidAmount}
              />
              <Slider
                className="my-5"
                value={[clampedSliderAmount]}
                onValueChange={handleSliderChange}
                min={0}
                max={availableAmount}
                step={sliderStep}
                disabled={availableAmount <= 0 || isPending}
                aria-label={isDeposit ? "Сумма пополнения" : "Сумма вывода"}
              />
              <FieldDescription id={amountHelpId}>
                {helperText}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!isValidAmount || isPending}
          >
            {isDeposit ? "Зачислить" : "Вывести"}{" "}
            {isValidAmount ? formatTransferAmount(parsedAmount, currency) : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
