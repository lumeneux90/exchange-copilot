"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFinancialOrderAction } from "@/src/features/finance/model/actions";
import { notifyFinanceRefresh } from "@/src/features/finance/model/finance-context";
import type {
  FinanceAsset,
  FinanceState,
} from "@/src/features/finance/model/types";
import { getErrorMessage } from "@/src/lib/errors";
import { parseDecimalInput } from "@/src/lib/money";

export function OrderForm({
  onFinanceChange,
}: {
  onFinanceChange: (finance: FinanceState) => void;
}) {
  const [asset, setAsset] = React.useState<FinanceAsset>("RUB");
  const [amount, setAmount] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const parsedAmount = parseDecimalInput(amount);
  const isValid = parsedAmount > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValid) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await createFinancialOrderAction({
          amount: parsedAmount,
          asset,
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success("Ордер создан.");
        onFinanceChange(result.finance);
        setAmount("");
        notifyFinanceRefresh(result.finance);
      } catch (error) {
        toast.error(getErrorMessage(error, "Не удалось создать ордер."));
      }
    });
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Создать ордер</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="finance-order-asset">Актив</FieldLabel>
              <Select
                value={asset}
                onValueChange={(value) =>
                  setAsset((value ?? "RUB") as FinanceAsset)
                }
              >
                <SelectTrigger id="finance-order-asset" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    <SelectItem value="RUB">Рубли</SelectItem>
                    <SelectItem value="USD">Доллары</SelectItem>
                    <SelectItem value="XCP">XCP токены</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field data-invalid={amount.length > 0 && parsedAmount <= 0}>
              <FieldLabel htmlFor="finance-order-amount">Сумма</FieldLabel>
              <Input
                id="finance-order-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="100"
                aria-invalid={amount.length > 0 && parsedAmount <= 0}
              />
            </Field>

            <Button type="submit" disabled={!isValid || isPending}>
              Создать заявку
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
