import { NextResponse } from "next/server";

import { stocks } from "@/src/entities/stock/model/mock";
import type { Stock } from "@/src/entities/stock/model/types";

export async function GET() {
  return NextResponse.json<Stock[]>(stocks);
}
