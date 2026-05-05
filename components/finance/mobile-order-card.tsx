import { OrderActionButtons } from "@/components/finance/order-action-buttons";
import {
  formatAssetAmount,
  formatOrderDate,
  formatOrderId,
  getStatusBadgeVariant,
  getStatusLabel,
} from "@/components/finance/finance-formatters";
import { Badge } from "@/components/ui/badge";
import type {
  FinanceState,
  FinancialOrderItem,
} from "@/src/features/finance/model/types";

export function MobileOrderCard({
  onFinanceChange,
  order,
  showActions,
}: {
  onFinanceChange?: (finance: FinanceState) => void;
  order: FinancialOrderItem;
  showActions: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <span className="text-muted-foreground font-mono text-xs">
          #{formatOrderId(order.id)}
        </span>
        <Badge variant={getStatusBadgeVariant(order.status)}>
          {getStatusLabel(order.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">
              {order.creatorLogin}
            </span>
            {order.relation === "own" ? (
              <span
                className="bg-chart-3 inline-flex size-2 rounded-full"
                aria-label="Моя заявка"
                title="Моя заявка"
              />
            ) : null}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            {formatOrderDate(order.createdAt)}
          </div>
        </div>
        <div className="text-right text-sm font-semibold tabular-nums">
          {formatAssetAmount(order.amount, order.asset)}
        </div>
      </div>

      {showActions && onFinanceChange ? (
        <OrderActionButtons order={order} onFinanceChange={onFinanceChange} />
      ) : null}
    </div>
  );
}
