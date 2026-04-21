import { NextResponse } from "next/server";

import { getCurrencyCandles } from "@/src/entities/market/api/get-currency-candles";
import {
  getStockCandles,
  type CandleRange,
} from "@/src/entities/stock/api/get-stock-candles";

const VALID_RANGES: CandleRange[] = ["day", "week", "month", "year", "all"];

function getRangeParam(value: string | null): CandleRange {
  if (value && VALID_RANGES.includes(value as CandleRange)) {
    return value as CandleRange;
  }

  return "day";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker") ?? "";
  const fx = searchParams.get("fx") ?? "";
  const range = getRangeParam(searchParams.get("range"));

  const candles = fx
    ? await getCurrencyCandles(fx, range)
    : await getStockCandles(ticker, range);

  return NextResponse.json(candles);
}
