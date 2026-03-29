import { NextResponse } from "next/server";

import { getStocks } from "@/src/entities/stock/api/get-stocks";

export async function GET() {
  const stocks = await getStocks();

  return NextResponse.json(stocks);
}
