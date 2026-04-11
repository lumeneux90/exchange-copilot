-- CreateEnum
CREATE TYPE "PortfolioTransactionType" AS ENUM ('DEPOSIT', 'BUY', 'SELL', 'FX_BUY', 'FX_SELL');

-- CreateTable
CREATE TABLE "portfolio_transactions" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "type" "PortfolioTransactionType" NOT NULL,
    "ticker" TEXT,
    "currency_code" TEXT,
    "quantity" DECIMAL(20,8),
    "price" DECIMAL(20,8),
    "amount" DECIMAL(20,8) NOT NULL,
    "fee_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_transactions_portfolio_id_executed_at_idx" ON "portfolio_transactions"("portfolio_id", "executed_at" DESC);

-- CreateIndex
CREATE INDEX "portfolio_transactions_portfolio_id_type_executed_at_idx" ON "portfolio_transactions"("portfolio_id", "type", "executed_at" DESC);

-- AddForeignKey
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
