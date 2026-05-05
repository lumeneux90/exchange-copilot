"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  acceptFinancialOrderAction,
  cancelFinancialOrderAction,
} from "@/src/features/finance/model/actions";
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
  const isAvailableOpen =
    order.status === "OPEN" && order.relation === "available";
  const isOwnOpen = order.status === "OPEN" && order.relation === "own";

  function runAction(action: "accept" | "cancel") {
    setPendingAction(action);

    React.startTransition(async () => {
      try {
        const result =
          action === "accept"
            ? await acceptFinancialOrderAction(order.id)
            : await cancelFinancialOrderAction(order.id);

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

  if (isAvailableOpen) {
    return (
      <div className="flex justify-end">
        <Button
          size="sm"
          className="bg-chart-3 text-primary-foreground hover:bg-chart-1/80"
          onClick={() => runAction("accept")}
          disabled={pendingAction !== null}
        >
          Принять
        </Button>
      </div>
    );
  }

  if (isOwnOpen) {
    return (
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => runAction("cancel")}
          disabled={pendingAction !== null}
        >
          Отменить
        </Button>
      </div>
    );
  }

  return null;
}
