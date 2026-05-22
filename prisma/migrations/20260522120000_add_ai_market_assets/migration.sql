CREATE TYPE "UserKind" AS ENUM ('HUMAN', 'TREASURY', 'AI_AGENT');

ALTER TABLE "users"
ADD COLUMN "kind" "UserKind" NOT NULL DEFAULT 'HUMAN';

DELETE FROM "financial_trades"
WHERE "asset" IN ('EUR', 'CNY') OR "quote_asset" IN ('EUR', 'CNY');

DELETE FROM "financial_orders"
WHERE "asset" IN ('EUR', 'CNY') OR "quote_asset" IN ('EUR', 'CNY');

DELETE FROM "financial_market_pairs"
WHERE "base_asset" IN ('EUR', 'CNY') OR "quote_asset" IN ('EUR', 'CNY');

DELETE FROM "financial_accounts"
WHERE "asset" IN ('EUR', 'CNY');

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
  'XRP',
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
