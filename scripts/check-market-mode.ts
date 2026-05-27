import "dotenv/config";

import { getCurrentMarketMode } from "../src/features/finance/model/market-orchestrator";
import { getPrisma } from "../src/lib/db";

async function main() {
  const result = await getCurrentMarketMode();

  console.log(
    JSON.stringify(
      {
        llmError: result.llmError,
        llmStatus: result.llmStatus,
        mode: result.mode,
        modeSource: result.modeSource,
        pairs: result.snapshot.pairs.map((pair) => ({
          referencePrice: pair.referencePrice,
          referenceSource: pair.referenceSource,
          spreadBps: pair.spreadBps,
          symbol: pair.symbol,
        })),
        treasuryReserves: result.snapshot.treasuryReserves,
        xcp: result.snapshot.xcp,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Failed to check market mode.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
