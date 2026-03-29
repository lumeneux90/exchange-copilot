import { NextResponse } from "next/server";

import { stocks } from "@/src/entities/stock/model/mock";

export async function GET() {
  return NextResponse.json(stocks);
}
