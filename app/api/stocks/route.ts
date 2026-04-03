import { NextResponse } from "next/server";

import { getStocks } from "@/src/entities/stock/api/get-stocks";

function getNumberParam(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = getNumberParam(searchParams.get("offset"), 0);
  const limit = getNumberParam(searchParams.get("limit"), 80);
  const stocks = await getStocks({ offset, limit });

  return NextResponse.json(stocks);
}
