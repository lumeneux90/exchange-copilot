-- CreateEnum
CREATE TYPE "BrokerageCurrency" AS ENUM ('RUB', 'USD', 'EUR', 'CNY');

-- AlterEnum
ALTER TYPE "PortfolioTransactionType" ADD VALUE 'WITHDRAWAL';

-- CreateTable
CREATE TABLE "brokerage_cash_balances" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "currency" "BrokerageCurrency" NOT NULL,
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "average_rate" DECIMAL(20,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brokerage_cash_balances_pkey" PRIMARY KEY ("id")
);

-- SeedBrokerageCash
INSERT INTO "brokerage_cash_balances" (
    "id",
    "portfolio_id",
    "currency",
    "balance",
    "average_rate",
    "created_at",
    "updated_at"
)
SELECT
    'brokerage_cash_' || substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 24),
    "id",
    'RUB'::"BrokerageCurrency",
    "cash_balance",
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "portfolios"
WHERE "cash_balance" <> 0
ON CONFLICT DO NOTHING;

INSERT INTO "brokerage_cash_balances" (
    "id",
    "portfolio_id",
    "currency",
    "balance",
    "average_rate",
    "created_at",
    "updated_at"
)
SELECT
    'brokerage_cash_' || substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 24),
    "portfolio_id",
    "currency_code"::"BrokerageCurrency",
    "quantity",
    "average_rate",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "portfolio_positions"
WHERE
    "type" = 'CURRENCY'
    AND "currency_code" IN ('USD', 'EUR', 'CNY')
    AND "quantity" <> 0
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "brokerage_cash_balances_portfolio_id_currency_key" ON "brokerage_cash_balances"("portfolio_id", "currency");

-- CreateIndex
CREATE INDEX "brokerage_cash_balances_portfolio_id_idx" ON "brokerage_cash_balances"("portfolio_id");

-- AddForeignKey
ALTER TABLE "brokerage_cash_balances" ADD CONSTRAINT "brokerage_cash_balances_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
