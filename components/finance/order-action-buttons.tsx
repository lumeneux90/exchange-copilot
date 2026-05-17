"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelFinancialOrderAction } from "@/src/features/finance/model/actions";
import { notifyFinanceRefresh } from "@/src/features/finance/model/finance-context";
import type {
  FinanceState,
  FinancialOrderItem,
} from "@/src/features/finance/model/types";
import { getErrorMessage } from "@/src/lib/errors";

export function OrderActionButtons({
  onFinanceChange,
  order,
}: {
  onFinanceChange: (finance: FinanceState) => void;
  order: FinancialOrderItem;
}) {
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const isOwnOpen =
    (order.status === "OPEN" || order.status === "PARTIALLY_FILLED") &&
    order.relation === "own";

  function runCancel() {
    setPendingAction("cancel");

    React.startTransition(async () => {
      try {
        const result = await cancelFinancialOrderAction(
          order.id,
          `${order.asset}/${order.quoteAsset}`
        );

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success("Ордер обновлен.");
        onFinanceChange(result.finance);
        notifyFinanceRefresh(result.finance);
      } catch (error) {
        toast.error(getErrorMessage(error, "Не удалось обновить ордер."));
      } finally {
        setPendingAction(null);
      }
    });
  }

  if (isOwnOpen) {
    return (
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="destructive"
          onClick={runCancel}
          disabled={pendingAction !== null}
        >
          Отменить
        </Button>
      </div>
    );
  }

  return null;
}
