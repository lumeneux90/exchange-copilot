import { NextRequest, NextResponse } from "next/server";

import { getCurrentMarketMode } from "@/src/features/finance/model/market-orchestrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }
  }

  const result = await getCurrentMarketMode();

  return NextResponse.json({
    ok: true,
    llmError: result.llmError,
    llmStatus: result.llmStatus,
    mode: result.mode,
    modeSource: result.modeSource,
    pairsCount: result.snapshot.pairs.length,
    xcp: result.snapshot.xcp,
  });
}
