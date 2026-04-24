import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Stock } from "@/src/entities/stock/model/types";
import type {
  PortfolioHistoryItem,
  PortfolioHistoryPage,
} from "@/src/features/portfolio/model/history";
import {
  formatSignedCurrency,
  rubFormatter,
} from "@/src/lib/money";
import { cn } from "@/src/lib/utils";

const transactionTypeLabels: Record<PortfolioHistoryItem["type"], string> = {
  DEPOSIT: "Пополнение",
  BUY: "Покупка",
  SELL: "Продажа",
  FX_BUY: "Покупка валюты",
  FX_SELL: "Продажа валюты",
};

const transactionTypeVariants: Record<
  PortfolioHistoryItem["type"],
  React.ComponentProps<typeof Badge>["variant"]
> = {
  DEPOSIT: "outline",
  BUY: "secondary",
  SELL: "destructive",
  FX_BUY: "secondary",
  FX_SELL: "destructive",
};

const transactionTypeClassNames: Record<PortfolioHistoryItem["type"], string> = {
  DEPOSIT:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  BUY: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
  SELL:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
  FX_BUY:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  FX_SELL:
    "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
};

function formatExecutedAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatQuantity(value: number | null, code?: string | null) {
  if (value == null) {
    return "—";
  }

  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return code ? `${formatted} ${code}` : formatted;
}

function getInstrumentLabel(item: PortfolioHistoryItem, stocksByTicker: Map<string, Stock>) {
  if (item.ticker) {
    return `${item.ticker} · ${stocksByTicker.get(item.ticker)?.name ?? "Акция"}`;
  }

  if (item.currencyCode) {
    return item.currencyCode;
  }

  return "RUB";
}

function getCashMovement(item: PortfolioHistoryItem) {
  switch (item.type) {
    case "DEPOSIT":
      return item.amount;
    case "BUY":
    case "FX_BUY":
      return -(item.amount + item.feeAmount);
    case "SELL":
    case "FX_SELL":
      return item.amount - item.feeAmount;
  }
}

function getCashMovementTone(value: number) {
  if (value > 0) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (value < 0) {
    return "text-red-600 dark:text-red-400";
  }

  return "text-muted-foreground";
}

function getHistoryPageHref(page: number) {
  return page <= 1 ? "/history" : `/history?page=${page}`;
}

function getVisibleHistoryPages(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages]);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((left, right) => left - right);
}

export function HistoryTable({
  items,
  pagination,
  stocks,
}: {
  items: PortfolioHistoryItem[];
  pagination: Omit<PortfolioHistoryPage, "items">;
  stocks: Stock[];
}) {
  const stocksByTicker = new Map(stocks.map((stock) => [stock.ticker, stock]));
  const firstVisibleItem =
    pagination.totalItems === 0
      ? 0
      : (pagination.currentPage - 1) * pagination.pageSize + 1;
  const lastVisibleItem = Math.min(
    pagination.currentPage * pagination.pageSize,
    pagination.totalItems
  );
  const visiblePages = getVisibleHistoryPages(
    pagination.currentPage,
    pagination.totalPages
  );

  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-base font-medium">Операции по портфелю</h2>
        <Badge variant="outline">{pagination.totalItems} записей</Badge>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Операция</TableHead>
              <TableHead>Инструмент</TableHead>
              <TableHead className="text-right">Количество</TableHead>
              <TableHead className="text-right">Цена</TableHead>
              <TableHead className="text-right">Оборот</TableHead>
              <TableHead className="text-right">Комиссия</TableHead>
              <TableHead className="text-right">Движение средств</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const cashMovement = getCashMovement(item);

              return (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatExecutedAt(item.executedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={transactionTypeVariants[item.type]}
                      className={transactionTypeClassNames[item.type]}
                    >
                      {transactionTypeLabels[item.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getInstrumentLabel(item, stocksByTicker)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantity(item.quantity, item.currencyCode)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.price == null ? "—" : rubFormatter.format(item.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {rubFormatter.format(item.amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.feeAmount > 0
                      ? rubFormatter.format(item.feeAmount)
                      : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-medium",
                      getCashMovementTone(cashMovement)
                    )}
                  >
                    {formatSignedCurrency(cashMovement)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <div className="text-muted-foreground text-sm">
          {firstVisibleItem}–{lastVisibleItem} из {pagination.totalItems}
        </div>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={getHistoryPageHref(
                  Math.max(1, pagination.currentPage - 1)
                )}
                text="Назад"
                aria-disabled={pagination.currentPage <= 1}
                tabIndex={pagination.currentPage <= 1 ? -1 : undefined}
                className={cn(
                  pagination.currentPage <= 1 &&
                    "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>

            {visiblePages.map((page, index) => {
              const previousPage = visiblePages[index - 1];
              const shouldShowEllipsis =
                previousPage != null && page - previousPage > 1;

              return (
                <React.Fragment key={page}>
                  {shouldShowEllipsis ? (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : null}
                  <PaginationItem>
                    <PaginationLink
                      href={getHistoryPageHref(page)}
                      isActive={page === pagination.currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              );
            })}

            <PaginationItem>
              <PaginationNext
                href={getHistoryPageHref(
                  Math.min(pagination.totalPages, pagination.currentPage + 1)
                )}
                text="Вперед"
                aria-disabled={
                  pagination.currentPage >= pagination.totalPages
                }
                tabIndex={
                  pagination.currentPage >= pagination.totalPages
                    ? -1
                    : undefined
                }
                className={cn(
                  pagination.currentPage >= pagination.totalPages &&
                    "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
