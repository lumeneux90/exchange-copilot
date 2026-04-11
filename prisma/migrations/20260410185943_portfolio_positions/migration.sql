-- CreateEnum
CREATE TYPE "PortfolioPositionType" AS ENUM ('STOCK', 'CURRENCY');

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cash_balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_positions" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "type" "PortfolioPositionType" NOT NULL,
    "ticker" TEXT,
    "currency_code" TEXT,
    "quantity" DECIMAL(20,8) NOT NULL,
    "average_price" DECIMAL(20,8),
    "average_rate" DECIMAL(20,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_user_id_key" ON "portfolios"("user_id");

-- CreateIndex
CREATE INDEX "portfolio_positions_portfolio_id_idx" ON "portfolio_positions"("portfolio_id");

-- CreateIndex
CREATE INDEX "portfolio_positions_portfolio_id_type_idx" ON "portfolio_positions"("portfolio_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_positions_portfolio_id_ticker_key" ON "portfolio_positions"("portfolio_id", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_positions_portfolio_id_currency_code_key" ON "portfolio_positions"("portfolio_id", "currency_code");

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
