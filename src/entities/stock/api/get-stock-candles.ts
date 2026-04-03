type MoexCandleRow = Array<string | number | null>;

type MoexCandleBlock = {
  columns?: string[];
  data?: MoexCandleRow[];
};

type MoexCandlesResponse = {
  candles?: MoexCandleBlock;
};

export type StockCandle = {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  begin: string;
  end: string;
};

export type CandleRange = "day" | "week" | "month" | "year";

const MOEX_CANDLES_URL =
  "https://iss.moex.com/iss/engines/stock/markets/shares/securities";
const MOEX_TIMEZONE = "Europe/Moscow";

function getColumnValue(
  row: MoexCandleRow,
  columns: string[],
  columnName: string
) {
  const index = columns.indexOf(columnName);

  return index === -1 ? null : row[index];
}

function formatDateForMoex(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOEX_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function getDateRange(range: CandleRange) {
  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (range) {
    case "day":
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  return {
    from: formatDateForMoex(startDate),
    till: formatDateForMoex(endDate),
  };
}

function getInterval(range: CandleRange) {
  return range === "day" ? 10 : 24;
}

export async function getStockCandles(
  ticker: string,
  range: CandleRange
): Promise<StockCandle[]> {
  try {
    const normalizedTicker = ticker.trim().toUpperCase();

    if (!normalizedTicker) {
      return [];
    }

    const { from, till } = getDateRange(range);
    const interval = getInterval(range);
    const response = await fetch(
      `${MOEX_CANDLES_URL}/${normalizedTicker}/candles.json?iss.meta=off&from=${from}&till=${till}&interval=${interval}`,
      {
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      return [];
    }

    const moexData = (await response.json()) as MoexCandlesResponse;
    const candleColumns = moexData.candles?.columns ?? [];
    const candleRows = moexData.candles?.data ?? [];

    return candleRows
      .map((row) => {
        const open = Number(getColumnValue(row, candleColumns, "open") ?? 0);
        const close = Number(getColumnValue(row, candleColumns, "close") ?? 0);
        const high = Number(getColumnValue(row, candleColumns, "high") ?? 0);
        const low = Number(getColumnValue(row, candleColumns, "low") ?? 0);
        const volume = Number(
          getColumnValue(row, candleColumns, "volume") ?? 0
        );
        const begin = String(getColumnValue(row, candleColumns, "begin") ?? "");
        const end = String(getColumnValue(row, candleColumns, "end") ?? "");

        return {
          open: Number.isFinite(open) ? open : 0,
          close: Number.isFinite(close) ? close : 0,
          high: Number.isFinite(high) ? high : 0,
          low: Number.isFinite(low) ? low : 0,
          volume: Number.isFinite(volume) ? volume : 0,
          begin,
          end,
        };
      })
      .filter(
        (candle) =>
          candle.begin &&
          candle.end &&
          candle.open > 0 &&
          candle.close > 0 &&
          candle.high > 0 &&
          candle.low > 0
      );
  } catch {
    return [];
  }
}
