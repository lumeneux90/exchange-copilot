import type { Stock } from "@/src/entities/stock/model/types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatPrice(value: number) {
  return `${value.toFixed(2)} RUB`
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : ""

  return `${sign}${value.toFixed(2)}%`
}

export function DataTable({ data }: { data: Stock[] }) {
  return (
    <div className="px-4 lg:px-6">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-medium">Список акций</h2>
            <p className="text-muted-foreground text-sm">
              Текущая цена, предыдущая цена и изменение по каждой бумаге
            </p>
          </div>
          <Badge variant="outline">{data.length} позиций</Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Тикер</TableHead>
              <TableHead>Компания</TableHead>
              <TableHead className="text-right">Текущая</TableHead>
              <TableHead className="text-right">Предыдущая</TableHead>
              <TableHead className="text-right">Изм.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((stock) => (
              <TableRow key={stock.ticker}>
                <TableCell className="font-medium">{stock.ticker}</TableCell>
                <TableCell className="max-w-[320px] truncate">
                  {stock.name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPrice(stock.price)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatPrice(stock.previousPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(stock.changePercent)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
