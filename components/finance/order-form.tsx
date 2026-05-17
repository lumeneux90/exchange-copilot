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
  FinanceState,
  FinancialMarketPairItem,
  FinancialOrderSide,
} from "@/src/features/finance/model/types";
import { getErrorMessage } from "@/src/lib/errors";
import { parseDecimalInput } from "@/src/lib/money";

export function OrderForm({
  fixedSide,
  onFinanceChange,
  pair,
}: {
  fixedSide?: FinancialOrderSide;
  onFinanceChange: (finance: FinanceState) => void;
  pair: FinancialMarketPairItem;
}) {
  const [side, setSide] = React.useState<FinancialOrderSide>(
    fixedSide ?? "BUY"
  );
  const [amount, setAmount] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const parsedAmount = parseDecimalInput(amount);
  const parsedPrice = parseDecimalInput(price);
  const isValid = parsedAmount > 0 && parsedPrice > 0;
  const resolvedSide = fixedSide ?? side;

  React.useEffect(() => {
    if (fixedSide) {
      setSide(fixedSide);
    }
  }, [fixedSide]);

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
          side: resolvedSide,
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
      <CardHeader>
        <CardTitle>
          {resolvedSide === "BUY" ? "Купить" : "Продать"} {pair.baseAsset}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {!fixedSide ? (
              <Field>
                <FieldLabel htmlFor="finance-order-side">Сторона</FieldLabel>
                <Select
                  value={side}
                  onValueChange={(value) =>
                    setSide((value ?? "BUY") as FinancialOrderSide)
                  }
                >
                  <SelectTrigger id="finance-order-side" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      <SelectItem value="BUY">
                        Купить {pair.baseAsset} за {pair.quoteAsset}
                      </SelectItem>
                      <SelectItem value="SELL">
                        Продать {pair.baseAsset} за {pair.quoteAsset}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

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

            <Field data-invalid={price.length > 0 && parsedPrice <= 0}>
              <FieldLabel htmlFor="finance-order-price">
                Цена за {pair.baseAsset}
              </FieldLabel>
              <Input
                id="finance-order-price"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="100"
                aria-invalid={price.length > 0 && parsedPrice <= 0}
              />
            </Field>

            <Button type="submit" disabled={!isValid || isPending}>
              {resolvedSide === "BUY" ? "Купить" : "Продать"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
