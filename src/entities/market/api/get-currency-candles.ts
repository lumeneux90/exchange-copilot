import type {
  CandleRange,
  StockCandle,
} from "@/src/entities/stock/api/get-stock-candles";
import { getFxInstrumentByCode } from "@/src/entities/market/model/fx-instruments";

type CbrRecord = {
  date: string;
  nominal: number;
  value: number;
};

const CBR_DYNAMIC_URL = "https://www.cbr.ru/scripts/XML_dynamic.asp";
const CBR_TIMEZONE = "Europe/Moscow";

function formatDateForCbr(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: CBR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${day}/${month}/${year}`;
}

function formatIsoDate(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CBR_TIMEZONE,
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
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case "year":
      startDate.setFullYear(startDate.getFullYear() - 3);
      break;
    case "all":
      startDate.setFullYear(2000, 0, 1);
      break;
  }

  return {
    from: formatDateForCbr(startDate),
    till: formatDateForCbr(endDate),
  };
}

function parseCbrDate(value: string) {
  const [day, month, year] = value.split(".");

  if (!day || !month || !year) {
    return null;
  }

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumber(value: string) {
  return Number(value.replace(",", ".").trim());
}

function parseCbrRecords(xml: string): CbrRecord[] {
  const recordMatches = xml.matchAll(
    /<Record\s+Date="([^"]+)"[^>]*>[\s\S]*?<Nominal>([^<]+)<\/Nominal>[\s\S]*?<Value>([^<]+)<\/Value>[\s\S]*?<\/Record>/g
  );

  return Array.from(recordMatches)
    .map((match) => {
      const date = match[1] ?? "";
      const nominal = parseNumber(match[2] ?? "");
      const value = parseNumber(match[3] ?? "");

      return {
        date,
        nominal,
        value,
      };
    })
    .filter(
      (record) =>
        Boolean(parseCbrDate(record.date)) &&
        Number.isFinite(record.nominal) &&
        record.nominal > 0 &&
        Number.isFinite(record.value) &&
        record.value > 0
    );
}

function mapRecordsToCandles(records: CbrRecord[]): StockCandle[] {
  return records
    .map((record) => {
      const date = parseCbrDate(record.date);

      if (!date) {
        return null;
      }

      const price = record.value / record.nominal;
      const isoDate = formatIsoDate(date);

      return {
        open: price,
        close: price,
        high: price,
        low: price,
        volume: 0,
        begin: isoDate,
        end: isoDate,
      };
    })
    .filter((record): record is StockCandle => record !== null);
}

export async function getCurrencyCandles(
  code: string,
  range: CandleRange
): Promise<StockCandle[]> {
  try {
    const instrument = getFxInstrumentByCode(code);

    if (!instrument) {
      return [];
    }

    const { from, till } = getDateRange(range);
    const response = await fetch(
      `${CBR_DYNAMIC_URL}?date_req1=${from}&date_req2=${till}&VAL_NM_RQ=${instrument.cbrId}`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const records = parseCbrRecords(xml);

    return mapRecordsToCandles(records);
  } catch {
    return [];
  }
}
