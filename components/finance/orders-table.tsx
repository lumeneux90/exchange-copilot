"use client";

import * as React from "react";
import { RiArrowRightLine } from "@remixicon/react";

import {
  formatAssetAmount,
  formatOrderDate,
  formatOrderId,
  getStatusBadgeVariant,
  getStatusLabel,
} from "@/components/finance/finance-formatters";
import { MobileOrderCard } from "@/components/finance/mobile-order-card";
import { OrderActionButtons } from "@/components/finance/order-action-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  FinanceState,
  FinancialOrderItem,
} from "@/src/features/finance/model/types";
import { cn } from "@/src/lib/utils";

export function OrdersTable({
  emptyIcon,
  emptyTitle,
  onFinanceChange,
  orders,
  pageSize,
  showActions = true,
}: {
  emptyIcon?: React.ReactNode;
  emptyTitle: string;
  onFinanceChange?: (finance: FinanceState) => void;
  orders: FinancialOrderItem[];
  pageSize?: number;
  showActions?: boolean;
}) {
  const [page, setPage] = React.useState(1);
  const totalPages = pageSize
    ? Math.max(1, Math.ceil(orders.length / pageSize))
    : 1;
  const visibleOrders = pageSize
    ? orders.slice((page - 1) * pageSize, page * pageSize)
    : orders;

  React.useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  if (!orders.length) {
    return (
      <Empty className="min-h-64 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {emptyIcon ?? <RiArrowRightLine />}
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>
            Ордера появятся здесь после создания или получения заявки.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-2 md:hidden">
        {visibleOrders.map((order) => (
          <MobileOrderCard
            key={order.id}
            order={order}
            onFinanceChange={onFinanceChange}
            showActions={showActions}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Заявка</TableHead>
              <TableHead>Автор</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              {showActions ? (
                <TableHead className="text-right">Действие</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <span className="text-muted-foreground font-mono text-xs">
                    #{formatOrderId(order.id)}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    "font-medium",
                    order.relation === "own" && "text-primary"
                  )}
                >
                  {order.creatorLogin}
                </TableCell>
                <TableCell className="font-medium tabular-nums">
                  {formatAssetAmount(order.amount, order.asset)}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatOrderDate(order.createdAt)}
                </TableCell>
                {showActions ? (
                  <TableCell>
                    {onFinanceChange ? (
                      <OrderActionButtons
                        order={order}
                        onFinanceChange={onFinanceChange}
                      />
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pageSize && totalPages > 1 ? (
        <Pagination className="mt-4 justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((currentPage) => Math.max(1, currentPage - 1))
                }
                disabled={page <= 1}
              >
                Назад
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="text-muted-foreground px-2 text-xs">
                {page} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((currentPage) =>
                    Math.min(totalPages, currentPage + 1)
                  )
                }
                disabled={page >= totalPages}
              >
                Вперед
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
