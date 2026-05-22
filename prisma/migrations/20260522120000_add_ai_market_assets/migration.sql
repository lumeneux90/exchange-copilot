CREATE TYPE "UserKind" AS ENUM ('HUMAN', 'TREASURY', 'AI_AGENT');

ALTER TABLE "users"
ADD COLUMN "kind" "UserKind" NOT NULL DEFAULT 'HUMAN';

ALTER TYPE "FinancialAsset" RENAME TO "FinancialAsset_old";

CREATE TYPE "FinancialAsset" AS ENUM (
  'RUB',
  'USD',
  'USDT',
  'XCP',
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'DOGE',
  'TON'
);

ALTER TABLE "financial_accounts"
ALTER COLUMN "asset" TYPE "FinancialAsset"
USING "asset"::text::"FinancialAsset";

ALTER TABLE "financial_market_pairs"
ALTER COLUMN "base_asset" TYPE "FinancialAsset"
USING "base_asset"::text::"FinancialAsset",
ALTER COLUMN "quote_asset" TYPE "FinancialAsset"
USING "quote_asset"::text::"FinancialAsset";

ALTER TABLE "financial_orders"
ALTER COLUMN "quote_asset" DROP DEFAULT,
ALTER COLUMN "asset" TYPE "FinancialAsset"
USING "asset"::text::"FinancialAsset",
ALTER COLUMN "quote_asset" TYPE "FinancialAsset"
USING "quote_asset"::text::"FinancialAsset",
ALTER COLUMN "quote_asset" SET DEFAULT 'RUB';

ALTER TABLE "financial_trades"
ALTER COLUMN "asset" TYPE "FinancialAsset"
USING "asset"::text::"FinancialAsset",
ALTER COLUMN "quote_asset" TYPE "FinancialAsset"
USING "quote_asset"::text::"FinancialAsset";

DROP TYPE "FinancialAsset_old";
