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
import { usePortfolio } from "@/src/features/portfolio/model/portfolio-context";
import { getErrorMessage } from "@/src/lib/errors";
import { parseDecimalInput } from "@/src/lib/money";

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
  const isValidAmount = parsedAmount > 0;

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
        className={side === "bottom" ? "max-h-[85vh]" : "sm:max-w-md"}
      >
        <SheetHeader>
          <SheetTitle>Пополнение счета</SheetTitle>
          <SheetDescription>
            Пополнение выполняется моментально.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 px-6">
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
              maxLength={999999}
            />
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
