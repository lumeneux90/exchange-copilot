import type { Stock } from "@/src/entities/stock/model/types";

const MOEX_URL =
  "https://iss.moex.com/iss/engines/stock/markets/shares/securities.json";
const STOCKS_LIMIT = 15;

type MoexRow = Array<string | number | null>;

type MoexBlock = {
  columns?: string[];
  data?: MoexRow[];
};

type MoexResponse = {
  securities?: MoexBlock;
  marketdata?: MoexBlock;
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
    getColumnValue(data.security, data.securityColumns, "SECID") ?? "",
  );
  const name = String(
    getColumnValue(data.security, data.securityColumns, "SHORTNAME") ?? "",
  );
  const lastPrice = getColumnValue(
    data.marketData ?? [],
    data.marketDataColumns,
    "LAST",
  );
  const prevPrice = getColumnValue(
    data.security,
    data.securityColumns,
    "PREVPRICE",
  );
  const price = Number(lastPrice ?? prevPrice ?? 0);

  return {
    ticker,
    name,
    price: Number.isFinite(price) ? price : 0,
  };
}

export async function getStocks(): Promise<Stock[]> {
  try {
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
      ]),
    );

    return securityRows
      .map((security) =>
        mapMoexToStock({
          security,
          securityColumns,
          marketData: marketDataByTicker.get(
            String(getColumnValue(security, securityColumns, "SECID") ?? ""),
          ),
          marketDataColumns,
        }),
      )
      .filter((stock) => stock.ticker && stock.name)
      .slice(0, STOCKS_LIMIT);
  } catch {
    return [];
  }
}
