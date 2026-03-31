import type { Stock } from "@/src/entities/stock/model/types";

const MOEX_URL =
  "https://iss.moex.com/iss/engines/stock/markets/shares/securities.json";
const DEFAULT_STOCKS_LIMIT = 15;

type MoexRow = Array<string | number | null>;

type MoexBlock = {
  columns?: string[];
  data?: MoexRow[];
};

type MoexResponse = {
  securities?: MoexBlock;
  marketdata?: MoexBlock;
};

type GetStocksOptions = {
  offset?: number;
  limit?: number;
};

function getColumnValue(row: MoexRow, columns: string[], columnName: string) {
  const index = columns.indexOf(columnName);

  return index === -1 ? null : row[index];
}

export function mapMoexToStock(data: {
  security: MoexRow;
  securityColumns: string[];
  marketData?: MoexRow;
  marketDataColumns: string[];
}): Stock {
  const ticker = String(
    getColumnValue(data.security, data.securityColumns, "SECID") ?? ""
  );
  const name = String(
    getColumnValue(data.security, data.securityColumns, "SHORTNAME") ?? ""
  );
  const lastPrice = getColumnValue(
    data.marketData ?? [],
    data.marketDataColumns,
    "LAST"
  );
  const prevPrice = getColumnValue(
    data.security,
    data.securityColumns,
    "PREVPRICE"
  );
  const price = Number(lastPrice ?? prevPrice ?? 0);
  const previousPrice = Number(prevPrice ?? price ?? 0);
  const safePrice = Number.isFinite(price) ? price : 0;
  const safePreviousPrice = Number.isFinite(previousPrice) ? previousPrice : 0;
  const change = safePrice - safePreviousPrice;
  const changePercent =
    safePreviousPrice > 0 ? (change / safePreviousPrice) * 100 : 0;

  return {
    ticker,
    name,
    price: safePrice,
    previousPrice: safePreviousPrice,
    change,
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
  };
}

export async function getStocks(
  options: GetStocksOptions = {}
): Promise<Stock[]> {
  try {
    const offset = Math.max(0, options.offset ?? 0);
    const limit = Math.max(1, options.limit ?? DEFAULT_STOCKS_LIMIT);
    const response = await fetch(MOEX_URL, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return [];
    }

    const moexData = (await response.json()) as MoexResponse;
    const securityColumns = moexData.securities?.columns ?? [];
    const securityRows = moexData.securities?.data ?? [];
    const marketDataColumns = moexData.marketdata?.columns ?? [];
    const marketDataRows = moexData.marketdata?.data ?? [];

    const marketDataByTicker = new Map(
      marketDataRows.map((row) => [
        String(getColumnValue(row, marketDataColumns, "SECID") ?? ""),
        row,
      ])
    );

    return securityRows
      .map((security) =>
        mapMoexToStock({
          security,
          securityColumns,
          marketData: marketDataByTicker.get(
            String(getColumnValue(security, securityColumns, "SECID") ?? "")
          ),
          marketDataColumns,
        })
      )
      .filter((stock) => stock.ticker && stock.name)
      .slice(offset, offset + limit);
  } catch {
    return [];
  }
}
