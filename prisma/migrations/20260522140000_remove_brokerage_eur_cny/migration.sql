DELETE FROM "brokerage_cash_balances"
WHERE "currency" IN ('EUR', 'CNY');

CREATE TYPE "BrokerageCurrency_new" AS ENUM ('RUB', 'USD');

ALTER TABLE "brokerage_cash_balances"
ALTER COLUMN "currency" TYPE "BrokerageCurrency_new"
USING "currency"::text::"BrokerageCurrency_new";

DROP TYPE "BrokerageCurrency";

ALTER TYPE "BrokerageCurrency_new" RENAME TO "BrokerageCurrency";
