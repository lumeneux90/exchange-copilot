import "dotenv/config";

import { runAiMarketTick } from "../src/features/finance/model/ai-market-runner";
import { getPrisma } from "../src/lib/db";

async function main() {
  const result = await runAiMarketTick();

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("Failed to run AI market tick.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
