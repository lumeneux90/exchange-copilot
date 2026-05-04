-- CreateEnum
CREATE TYPE "FinancialAsset" AS ENUM ('RUB', 'USD', 'XCP');

-- CreateEnum
CREATE TYPE "FinancialOrderStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset" "FinancialAsset" NOT NULL,
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_orders" (
    "id" TEXT NOT NULL,
    "creator_user_id" TEXT NOT NULL,
    "accepted_by_user_id" TEXT,
    "asset" "FinancialAsset" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "status" "FinancialOrderStatus" NOT NULL DEFAULT 'OPEN',
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_user_id_asset_key" ON "financial_accounts"("user_id", "asset");

-- CreateIndex
CREATE INDEX "financial_orders_creator_user_id_created_at_idx" ON "financial_orders"("creator_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "financial_orders_accepted_by_user_id_created_at_idx" ON "financial_orders"("accepted_by_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "financial_orders_status_created_at_idx" ON "financial_orders"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_orders" ADD CONSTRAINT "financial_orders_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_orders" ADD CONSTRAINT "financial_orders_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
