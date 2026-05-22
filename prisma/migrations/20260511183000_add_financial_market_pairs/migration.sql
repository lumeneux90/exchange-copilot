-- CreateTable
CREATE TABLE "financial_market_pairs" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "base_asset" "FinancialAsset" NOT NULL,
    "quote_asset" "FinancialAsset" NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "price_precision" INTEGER NOT NULL DEFAULT 2,
    "amount_precision" INTEGER NOT NULL DEFAULT 2,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_market_pairs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "financial_orders" ADD COLUMN "pair_id" TEXT;

-- AlterTable
ALTER TABLE "financial_trades" ADD COLUMN "pair_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "financial_market_pairs_symbol_key" ON "financial_market_pairs"("symbol");

-- CreateIndex
CREATE INDEX "financial_market_pairs_enabled_sort_order_idx" ON "financial_market_pairs"("enabled", "sort_order");

-- CreateIndex
CREATE INDEX "financial_orders_pair_id_side_status_price_created_at_idx" ON "financial_orders"("pair_id", "side", "status", "price", "created_at");

-- CreateIndex
CREATE INDEX "financial_trades_pair_id_executed_at_idx" ON "financial_trades"("pair_id", "executed_at" DESC);

-- AddForeignKey
ALTER TABLE "financial_orders" ADD CONSTRAINT "financial_orders_pair_id_fkey" FOREIGN KEY ("pair_id") REFERENCES "financial_market_pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_trades" ADD CONSTRAINT "financial_trades_pair_id_fkey" FOREIGN KEY ("pair_id") REFERENCES "financial_market_pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
