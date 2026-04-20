"use client";

import * as React from "react";
import { RiWallet3Line } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getDepositCooldownHours,
  MAX_DEPOSIT_AMOUNT,
  MONTHLY_DEPOSIT_LIMIT,
  MIN_DEPOSIT_AMOUNT,
  WEEKLY_DEPOSIT_LIMIT,
} from "@/src/features/portfolio/model/deposit-rules";
import { usePortfolio } from "@/src/features/portfolio/model/portfolio-context";
import { getErrorMessage } from "@/src/lib/errors";
import { parseDecimalInput, rubFormatterRounded } from "@/src/lib/money";

export function DepositFundsSheet({
  triggerLabel = "Пополнить счет",
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
  side = "right",
}: {
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const { depositFunds, isPending } = usePortfolio();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("10000");

  const parsedAmount = parseDecimalInput(amount);
  const isValidAmount =
    parsedAmount >= MIN_DEPOSIT_AMOUNT && parsedAmount <= MAX_DEPOSIT_AMOUNT;
  const helperText =
    parsedAmount > MAX_DEPOSIT_AMOUNT
      ? `Максимум за одно пополнение: ${rubFormatterRounded.format(
          MAX_DEPOSIT_AMOUNT
        )}.`
      : `Одно пополнение: от ${rubFormatterRounded.format(
          MIN_DEPOSIT_AMOUNT
        )} до ${rubFormatterRounded.format(
          MAX_DEPOSIT_AMOUNT
        )}. Кулдаун: ${getDepositCooldownHours()} ч. Лимиты: ${rubFormatterRounded.format(
          WEEKLY_DEPOSIT_LIMIT
        )} за 7 дней и ${rubFormatterRounded.format(
          MONTHLY_DEPOSIT_LIMIT
        )} за 30 дней.`;

  async function handleSubmit() {
    if (!isValidAmount) {
      return;
    }

    try {
      await depositFunds(parsedAmount);
      setAmount("10000");
      setOpen(false);
      toast.success("Баланс портфеля пополнен.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Не удалось пополнить счет."));
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
        <RiWallet3Line />
        {triggerLabel}
      </SheetTrigger>
      <SheetContent
        side={side}
        className={
          side === "bottom"
            ? "max-h-[100dvh]"
            : "h-[100dvh] sm:max-w-md"
        }
      >
        <SheetHeader>
          <SheetTitle>Пополнение счета</SheetTitle>
          <SheetDescription>
            Пополнение выполняется моментально, но защищено лимитом и паузой
            между попытками.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-4">
          <div className="space-y-2">
            <label htmlFor="deposit-amount" className="text-sm font-medium">
              Сумма пополнения, RUB
            </label>
            <Input
              id="deposit-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="10000"
              maxLength={12}
              aria-describedby="deposit-amount-help"
            />
            <p
              id="deposit-amount-help"
              className="text-muted-foreground text-xs leading-relaxed"
            >
              {helperText}
            </p>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!isValidAmount || isPending}
          >
            Зачислить {isValidAmount ? `${parsedAmount.toFixed(2)} RUB` : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
