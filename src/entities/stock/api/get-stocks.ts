import type { Stock } from "@/src/entities/stock/model/types";

const MOEX_URL =
  "https://iss.moex.com/iss/engines/stock/markets/shares/securities.json";
const DEFAULT_STOCKS_LIMIT = 80;

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

function getStockPrice(data: {
  security: MoexRow;
  securityColumns: string[];
  marketData?: MoexRow;
  marketDataColumns: string[];
}) {
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

  return Number.isFinite(price) ? price : 0;
}

function getOpeningPrice(data: {
  marketData?: MoexRow;
  marketDataColumns: string[];
}) {
  const openingPrice = Number(
    getColumnValue(data.marketData ?? [], data.marketDataColumns, "OPEN") ?? 0
  );

  return Number.isFinite(openingPrice) ? openingPrice : 0;
}

function getFirstFiniteColumnValue(
  row: MoexRow,
  columns: string[],
  columnNames: string[]
) {
  for (const columnName of columnNames) {
    const value = Number(getColumnValue(row, columns, columnName) ?? 0);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

function getTradedValue(data: {
  marketData?: MoexRow;
  marketDataColumns: string[];
}) {
  return getFirstFiniteColumnValue(data.marketData ?? [], data.marketDataColumns, [
    "VALTODAY",
    "VALUE",
    "VALTOUSDAY",
  ]);
}

function getTradedVolume(data: {
  marketData?: MoexRow;
  marketDataColumns: string[];
}) {
  return getFirstFiniteColumnValue(data.marketData ?? [], data.marketDataColumns, [
    "VOLTODAY",
    "VOLUME",
    "NUMTRADES",
  ]);
}

function getApproximateMarketCap(
  security: MoexRow,
  columns: string[],
  price: number
) {
  const issueSize = Number(getColumnValue(security, columns, "ISSUESIZE") ?? 0);
  const safeIssueSize = Number.isFinite(issueSize) ? issueSize : 0;

  return safeIssueSize * price;
}

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
  const price = getStockPrice(data);
  const openingPrice = getOpeningPrice(data);
  const safePrice = Number.isFinite(price) ? price : 0;
  const safeOpeningPrice = Number.isFinite(openingPrice) ? openingPrice : 0;
  const change = safePrice - safeOpeningPrice;
  const changePercent =
    safeOpeningPrice > 0 ? (change / safeOpeningPrice) * 100 : 0;
  const tradedValue = getTradedValue(data);
  const tradedVolume = getTradedVolume(data);

  return {
    ticker,
    name,
    price: safePrice,
    openingPrice: safeOpeningPrice,
    change,
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
    tradedValue,
    tradedVolume,
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

    const rankedStocks = securityRows
      .map((security) => {
        const ticker = String(
          getColumnValue(security, securityColumns, "SECID") ?? ""
        );
        const instrumentId = String(
          getColumnValue(security, securityColumns, "INSTRID") ?? ""
        );
        const marketData = marketDataByTicker.get(ticker);
        const price = getStockPrice({
          security,
          securityColumns,
          marketData,
          marketDataColumns,
        });

        return {
          instrumentId,
          marketCap: getApproximateMarketCap(security, securityColumns, price),
          stock: mapMoexToStock({
            security,
            securityColumns,
            marketData,
            marketDataColumns,
          }),
        };
      })
      .filter(
        ({ instrumentId, stock, marketCap }) =>
          instrumentId === "EQIN" &&
          stock.ticker &&
          stock.name &&
          stock.price > 0 &&
          stock.openingPrice > 0 &&
          marketCap > 0
      )
      .sort((left, right) => right.marketCap - left.marketCap);

    const uniqueStocks = new Map<string, Stock>();

    for (const { stock } of rankedStocks) {
      if (!uniqueStocks.has(stock.ticker)) {
        uniqueStocks.set(stock.ticker, stock);
      }
    }

    return Array.from(uniqueStocks.values()).slice(offset, offset + limit);
  } catch {
    return [];
  }
}
