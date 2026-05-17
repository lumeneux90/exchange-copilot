-- CreateEnum
CREATE TYPE "FinancialOrderSide" AS ENUM ('BUY', 'SELL');

-- AlterEnum
ALTER TYPE "FinancialOrderStatus" ADD VALUE 'PARTIALLY_FILLED';

-- AlterTable
ALTER TABLE "financial_accounts" ADD COLUMN "locked_balance" DECIMAL(20,8) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "financial_orders" ADD COLUMN "quote_asset" "FinancialAsset" NOT NULL DEFAULT 'RUB',
ADD COLUMN "side" "FinancialOrderSide" NOT NULL DEFAULT 'SELL',
ADD COLUMN "filled_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
ADD COLUMN "price" DECIMAL(20,8) NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "financial_trades" (
    "id" TEXT NOT NULL,
    "buy_order_id" TEXT NOT NULL,
    "sell_order_id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "seller_user_id" TEXT NOT NULL,
    "asset" "FinancialAsset" NOT NULL,
    "quote_asset" "FinancialAsset" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "quote_amount" DECIMAL(20,8) NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_orders_asset_quote_asset_side_status_price_created_at_idx" ON "financial_orders"("asset", "quote_asset", "side", "status", "price", "created_at");

-- CreateIndex
CREATE INDEX "financial_trades_asset_quote_asset_executed_at_idx" ON "financial_trades"("asset", "quote_asset", "executed_at" DESC);

-- CreateIndex
CREATE INDEX "financial_trades_buyer_user_id_executed_at_idx" ON "financial_trades"("buyer_user_id", "executed_at" DESC);

-- CreateIndex
CREATE INDEX "financial_trades_seller_user_id_executed_at_idx" ON "financial_trades"("seller_user_id", "executed_at" DESC);
