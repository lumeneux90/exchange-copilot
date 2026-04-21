"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiStarFill, RiStarLine } from "@remixicon/react";

import { CompanyLogo } from "@/components/company-logo";
import type { Stock } from "@/src/entities/stock/model/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWatchlist } from "@/src/features/watchlist/model/watchlist-context";
import { cn } from "@/src/lib/utils";

function formatPrice(value: number) {
  return `${value.toFixed(2)} RUB`;
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function getChangeColorClass(value: number) {
  if (value > 0) {
    return "text-primary";
  }

  if (value < 0) {
    return "text-destructive";
  }

  return "text-muted-foreground";
}

type SortOption =
  | "default"
  | "price-desc"
  | "price-asc"
  | "change-desc"
  | "change-asc";

const sortOptionLabels: Record<SortOption, string> = {
  default: "По умолчанию",
  "price-desc": "Цена: по убыванию",
  "price-asc": "Цена: по возрастанию",
  "change-desc": "Изм.: по убыванию",
  "change-asc": "Изм.: по возрастанию",
};

export function DataTable({ data }: { data: Stock[] }) {
  const router = useRouter();
  const { isInWatchlist, toggleTicker } = useWatchlist();
  const [sortBy, setSortBy] = React.useState<SortOption>("default");

  const sortedData = React.useMemo(() => {
    const nextData = [...data];

    switch (sortBy) {
      case "price-desc":
        return nextData.sort((left, right) => right.price - left.price);
      case "price-asc":
        return nextData.sort((left, right) => left.price - right.price);
      case "change-desc":
        return nextData.sort(
          (left, right) => right.changePercent - left.changePercent
        );
      case "change-asc":
        return nextData.sort(
          (left, right) => left.changePercent - right.changePercent
        );
      default:
        return nextData;
    }
  }, [data, sortBy]);

  function openChart(stock: Stock) {
    router.push(`/chart?ticker=${stock.ticker}`);
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-medium">Крупнейшие компании MOEX</h2>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger
                className="w-44"
                size="sm"
                aria-label="Выберите сортировку таблицы"
              >
                <SelectValue>{sortOptionLabels[sortBy]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="default" className="rounded-lg">
                  {sortOptionLabels.default}
                </SelectItem>
                <SelectItem value="price-desc" className="rounded-lg">
                  {sortOptionLabels["price-desc"]}
                </SelectItem>
                <SelectItem value="price-asc" className="rounded-lg">
                  {sortOptionLabels["price-asc"]}
                </SelectItem>
                <SelectItem value="change-desc" className="rounded-lg">
                  {sortOptionLabels["change-desc"]}
                </SelectItem>
                <SelectItem value="change-asc" className="rounded-lg">
                  {sortOptionLabels["change-asc"]}
                </SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{data.length} позиций</Badge>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Тикер</TableHead>
              <TableHead>Компания</TableHead>
              <TableHead className="text-right">Последняя</TableHead>
              <TableHead className="text-right">Открытие</TableHead>
              <TableHead className="text-right">% к откр.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((stock) => (
              <TableRow
                key={stock.ticker}
                className="cursor-pointer"
                tabIndex={0}
                aria-label={`Открыть график ${stock.ticker}`}
                onClick={() => openChart(stock)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openChart(stock);
                  }
                }}
              >
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-muted-foreground hover:text-foreground size-8 rounded-full",
                      isInWatchlist(stock.ticker) &&
                        "text-amber-500 hover:text-amber-500"
                    )}
                    aria-label={
                      isInWatchlist(stock.ticker)
                        ? `Убрать ${stock.ticker} из избранного`
                        : `Добавить ${stock.ticker} в избранное`
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleTicker(stock.ticker);
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    {isInWatchlist(stock.ticker) ? (
                      <RiStarFill className="size-4" />
                    ) : (
                      <RiStarLine className="size-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <CompanyLogo
                      ticker={stock.ticker}
                      name={stock.name}
                      className="size-8 rounded-md"
                    />
                    <span className="font-medium">{stock.ticker}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[320px] truncate">
                  {stock.name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPrice(stock.price)}
                </TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {formatPrice(stock.openingPrice)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${getChangeColorClass(stock.changePercent)}`}
                >
                  {formatPercent(stock.changePercent)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
