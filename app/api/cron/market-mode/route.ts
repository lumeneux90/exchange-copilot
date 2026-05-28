import { NextRequest, NextResponse } from "next/server";

import { runAiMarketTick } from "@/src/features/finance/model/ai-market-runner";

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

  const result = await runAiMarketTick();

  console.log(
    "[market-cron]",
    JSON.stringify({
      cancelledOrdersCount: result.cancelledOrdersCount,
      errors: result.errors,
      llmError: result.llmError,
      llmStatus: result.llmStatus,
      mode: result.mode.mode,
      modeSource: result.modeSource,
      placedOrdersCount: result.placedOrdersCount,
    })
  );

  return NextResponse.json({
    ok: true,
    cancelledOrdersCount: result.cancelledOrdersCount,
    errors: result.errors,
    llmError: result.llmError,
    llmStatus: result.llmStatus,
    mode: result.mode,
    modeSource: result.modeSource,
    placedOrdersCount: result.placedOrdersCount,
  });
}
