export type CurrencyRate = {
  code: string;
  label: string;
  price: number;
  openingPrice: number;
  change: number;
  changePercent: number;
};

type MoexRow = Array<string | number | null>;

type MoexBlock = {
  columns?: string[];
  data?: MoexRow[];
};

type MoexResponse = {
  securities?: MoexBlock;
  marketdata?: MoexBlock;
};

const MOEX_CURRENCY_URL =
  "https://iss.moex.com/iss/engines/currency/markets/selt/securities.json";

const CURRENCY_PAIRS = [
  {
    code: "USD000UTSTOM",
    label: "USD/RUB",
  },
  {
    code: "EUR_RUB__TOM",
    label: "EUR/RUB",
  },
  {
    code: "CNYRUB_TOM",
    label: "CNY/RUB",
  },
  {
    code: "GBPRUB_TOM",
    label: "GBP/RUB",
  },
  {
    code: "HKDRUB_TOM",
    label: "HKD/RUB",
  },
  {
    code: "AEDRUB_TOM",
    label: "AED/RUB",
  },
] as const;

function getColumnValue(row: MoexRow, columns: string[], columnName: string) {
  const index = columns.indexOf(columnName);

  return index === -1 ? null : row[index];
}

function toFiniteNumber(value: string | number | null) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getFirstFiniteNumber(
  row: MoexRow,
  columns: string[],
  columnNames: string[]
) {
  for (const columnName of columnNames) {
    const value = toFiniteNumber(getColumnValue(row, columns, columnName));

    if (value > 0) {
      return value;
    }
  }

  return 0;
}

export async function getCurrencyRates(): Promise<CurrencyRate[]> {
  try {
    const securitiesParam = CURRENCY_PAIRS.map((pair) => pair.code).join(",");
    const response = await fetch(
      `${MOEX_CURRENCY_URL}?iss.meta=off&securities=${securitiesParam}`,
      {
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      return [];
    }

    const moexData = (await response.json()) as MoexResponse;
    const securityColumns = moexData.securities?.columns ?? [];
    const securityRows = moexData.securities?.data ?? [];
    const marketDataColumns = moexData.marketdata?.columns ?? [];
    const marketDataRows = moexData.marketdata?.data ?? [];

    const securityByCode = new Map(
      securityRows.map((row) => [
        String(getColumnValue(row, securityColumns, "SECID") ?? ""),
        row,
      ])
    );
    const marketDataByCode = new Map(
      marketDataRows.map((row) => [
        String(getColumnValue(row, marketDataColumns, "SECID") ?? ""),
        row,
      ])
    );

    return CURRENCY_PAIRS.map((pair) => {
      const security = securityByCode.get(pair.code) ?? [];
      const marketData = marketDataByCode.get(pair.code) ?? [];
      const openingPrice = getFirstFiniteNumber(
        marketData,
        marketDataColumns,
        ["OPEN", "LCLOSEPRICE", "LCLOSE"]
      );
      const fallbackOpeningPrice =
        openingPrice ||
        getFirstFiniteNumber(security, securityColumns, ["PREVPRICE"]);
      const price = getFirstFiniteNumber(marketData, marketDataColumns, [
        "LAST",
        "MARKETPRICE",
        "LCURRENTPRICE",
        "LCLOSEPRICE",
        "LCLOSE",
        "LEGALCLOSEPRICE",
        "PREVWAPRICE",
      ]);
      const fallbackPrice =
        price ||
        getFirstFiniteNumber(security, securityColumns, [
          "PREVPRICE",
          "PREVWAPRICE",
        ]);
      const safeOpeningPrice =
        fallbackOpeningPrice > 0 ? fallbackOpeningPrice : fallbackPrice;
      const safePrice = fallbackPrice > 0 ? fallbackPrice : safeOpeningPrice;
      const change = safePrice - safeOpeningPrice;
      const changePercent =
        safeOpeningPrice > 0 ? (change / safeOpeningPrice) * 100 : 0;

      return {
        code: pair.code,
        label: pair.label,
        price: safePrice,
        openingPrice: safeOpeningPrice,
        change,
        changePercent: Number.isFinite(changePercent) ? changePercent : 0,
      };
    }).filter((pair) => pair.price > 0 && pair.openingPrice > 0);
  } catch {
    return [];
  }
}
