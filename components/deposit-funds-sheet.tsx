"use client";

import * as React from "react";
import { RiWallet3Line } from "@remixicon/react";

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

function parseAmount(value: string) {
  const normalized = value.replace(",", ".").replace(/\s+/g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : 0;
}

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
  const { depositFunds } = usePortfolio();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("10000");

  const parsedAmount = parseAmount(amount);
  const isValidAmount = parsedAmount > 0;

  function handleSubmit() {
    if (!isValidAmount) {
      return;
    }

    depositFunds(parsedAmount, "Пополнение из sidebar");
    setAmount("10000");
    setOpen(false);
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
            Добавим локальный баланс портфеля без бэкенда и БД. Деньги
            сохраняются в `localStorage`, так что можно уже строить портфельный
            сценарий.
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
            />
          </div>
          <div className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
            Быстрые идеи для следующего шага: сюда же можно добавить выбор
            счета, способ пополнения и затем buy/sell форму с тем же паттерном.
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!isValidAmount}>
            Зачислить {isValidAmount ? `${parsedAmount.toFixed(2)} RUB` : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
