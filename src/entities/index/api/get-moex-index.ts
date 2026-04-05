type MoexRow = Array<string | number | null>;

type MoexBlock = {
  columns?: string[];
  data?: MoexRow[];
};

type MoexIndexResponse = {
  marketdata?: MoexBlock;
  securities?: MoexBlock;
};

export type MoexIndexSnapshot = {
  changePercent: number;
  currentValue: number;
  openValue: number;
  previousValue: number;
  shortName: string;
  symbol: string;
};

const IMOEX_URL =
  "https://iss.moex.com/iss/engines/stock/markets/index/securities/IMOEX.json?iss.meta=off";

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

export async function getMoexIndex(): Promise<MoexIndexSnapshot | null> {
  try {
    const response = await fetch(IMOEX_URL, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as MoexIndexResponse;
    const marketDataColumns = payload.marketdata?.columns ?? [];
    const securityColumns = payload.securities?.columns ?? [];
    const marketData = payload.marketdata?.data?.[0] ?? [];
    const security = payload.securities?.data?.[0] ?? [];

    const currentValue = getFirstFiniteNumber(marketData, marketDataColumns, [
      "CURRENTVALUE",
      "LASTVALUE",
    ]);
    const openValue = getFirstFiniteNumber(marketData, marketDataColumns, [
      "OPENVALUE",
      "LASTVALUE",
    ]);
    const previousValue = getFirstFiniteNumber(marketData, marketDataColumns, [
      "LASTVALUE",
      "OPENVALUE",
    ]);
    const directChangePercent = getFirstFiniteNumber(
      marketData,
      marketDataColumns,
      ["LASTCHANGETOOPENPRC", "LASTCHANGEPRC"]
    );
    const changePercent =
      directChangePercent ||
      (openValue > 0 ? ((currentValue - openValue) / openValue) * 100 : 0);
    const shortName =
      String(getColumnValue(security, securityColumns, "SHORTNAME") ?? "").trim() ||
      "Индекс Мосбиржи";

    if (currentValue <= 0) {
      return null;
    }

    return {
      changePercent: Number.isFinite(changePercent) ? changePercent : 0,
      currentValue,
      openValue,
      previousValue,
      shortName,
      symbol: "IMOEX",
    };
  } catch {
    return null;
  }
}
