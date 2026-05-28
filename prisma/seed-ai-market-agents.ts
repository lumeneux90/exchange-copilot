import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  AI_MARKET_AGENT_USER_SEEDS,
  getSeedBalanceMultiplier,
} from "../src/features/finance/model/ai-market-agent-rules";

const connectionString = process.env.XC_COPILOT_DATABASE_URL;

if (!connectionString) {
  throw new Error("XC_COPILOT_DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type FinancialAssetSeed =
  | "RUB"
  | "USD"
  | "USDT"
  | "XCP"
  | "BTC"
  | "ETH"
  | "BNB"
  | "SOL"
  | "DOGE"
  | "TON";

type FinancialAccountSeed = {
  asset: FinancialAssetSeed;
  balance: number;
};

type FinancialMarketPairSeed = {
  amountPrecision: number;
  baseAsset: FinancialAssetSeed;
  label: string;
  pricePrecision: number;
  quoteAsset: FinancialAssetSeed;
  sortOrder: number;
  symbol: string;
};

const financialAccountSeeds = [
  { asset: "RUB", balance: 300_000 },
  { asset: "USD", balance: 3_000 },
  { asset: "USDT", balance: 10_000 },
  { asset: "BTC", balance: 0.05 },
  { asset: "ETH", balance: 1 },
  { asset: "BNB", balance: 1.5 },
  { asset: "SOL", balance: 15 },
  { asset: "DOGE", balance: 5_000 },
  { asset: "TON", balance: 500 },
  { asset: "XCP", balance: 500 },
] satisfies FinancialAccountSeed[];

const financialMarketPairSeeds = [
  {
    amountPrecision: 2,
    baseAsset: "USD",
    label: "USD/RUB",
    pricePrecision: 2,
    quoteAsset: "RUB",
    sortOrder: 1,
    symbol: "USD/RUB",
  },
  {
    amountPrecision: 2,
    baseAsset: "USD",
    label: "USD/USDT",
    pricePrecision: 4,
    quoteAsset: "USDT",
    sortOrder: 5,
    symbol: "USD/USDT",
  },
  {
    amountPrecision: 6,
    baseAsset: "BTC",
    label: "BTC/USDT",
    pricePrecision: 2,
    quoteAsset: "USDT",
    sortOrder: 10,
    symbol: "BTC/USDT",
  },
  {
    amountPrecision: 5,
    baseAsset: "ETH",
    label: "ETH/USDT",
    pricePrecision: 2,
    quoteAsset: "USDT",
    sortOrder: 20,
    symbol: "ETH/USDT",
  },
  {
    amountPrecision: 4,
    baseAsset: "BNB",
    label: "BNB/USDT",
    pricePrecision: 2,
    quoteAsset: "USDT",
    sortOrder: 30,
    symbol: "BNB/USDT",
  },
  {
    amountPrecision: 3,
    baseAsset: "SOL",
    label: "SOL/USDT",
    pricePrecision: 3,
    quoteAsset: "USDT",
    sortOrder: 40,
    symbol: "SOL/USDT",
  },
  {
    amountPrecision: 2,
    baseAsset: "DOGE",
    label: "DOGE/USDT",
    pricePrecision: 5,
    quoteAsset: "USDT",
    sortOrder: 60,
    symbol: "DOGE/USDT",
  },
  {
    amountPrecision: 2,
    baseAsset: "TON",
    label: "TON/USDT",
    pricePrecision: 4,
    quoteAsset: "USDT",
    sortOrder: 70,
    symbol: "TON/USDT",
  },
  {
    amountPrecision: 2,
    baseAsset: "XCP",
    label: "XCP/USDT",
    pricePrecision: 4,
    quoteAsset: "USDT",
    sortOrder: 80,
    symbol: "XCP/USDT",
  },
  {
    amountPrecision: 2,
    baseAsset: "XCP",
    label: "XCP/RUB",
    pricePrecision: 2,
    quoteAsset: "RUB",
    sortOrder: 90,
    symbol: "XCP/RUB",
  },
  {
    amountPrecision: 2,
    baseAsset: "XCP",
    label: "XCP/USD",
    pricePrecision: 4,
    quoteAsset: "USD",
    sortOrder: 100,
    symbol: "XCP/USD",
  },
] satisfies FinancialMarketPairSeed[];

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(8));
}

function multiplyFinancialAccountSeeds(multiplier: number) {
  return financialAccountSeeds.map((account) => ({
    ...account,
    balance: account.balance * multiplier,
  })) satisfies FinancialAccountSeed[];
}

async function upsertFinancialMarketPairs() {
  await Promise.all(
    financialMarketPairSeeds.map((pair) =>
      prisma.financialMarketPair.upsert({
        where: { symbol: pair.symbol },
        update: {
          amountPrecision: pair.amountPrecision,
          baseAsset: pair.baseAsset,
          enabled: true,
          label: pair.label,
          pricePrecision: pair.pricePrecision,
          quoteAsset: pair.quoteAsset,
          sortOrder: pair.sortOrder,
        },
        create: {
          amountPrecision: pair.amountPrecision,
          baseAsset: pair.baseAsset,
          label: pair.label,
          pricePrecision: pair.pricePrecision,
          quoteAsset: pair.quoteAsset,
          sortOrder: pair.sortOrder,
          symbol: pair.symbol,
        },
      })
    )
  );
}

async function upsertFinancialAccounts(
  userId: string,
  accounts: FinancialAccountSeed[]
) {
  await Promise.all(
    accounts.map((account) =>
      prisma.financialAccount.upsert({
        where: {
          userId_asset: {
            asset: account.asset,
            userId,
          },
        },
        update: {},
        create: {
          asset: account.asset,
          balance: decimal(account.balance),
          lockedBalance: decimal(0),
          userId,
        },
      })
    )
  );
}

async function main() {
  const passwordHash = await bcrypt.hash(randomUUID(), 12);

  await upsertFinancialMarketPairs();

  const users = await Promise.all(
    AI_MARKET_AGENT_USER_SEEDS.map((agent) =>
      prisma.user.upsert({
        where: { login: agent.login },
        update: {
          kind: agent.kind,
          passwordHash,
        },
        create: {
          kind: agent.kind,
          login: agent.login,
          passwordHash,
        },
      })
    )
  );

  await Promise.all(
    users.map((user, index) => {
      const agent = AI_MARKET_AGENT_USER_SEEDS[index];

      return upsertFinancialAccounts(
        user.id,
        multiplyFinancialAccountSeeds(
          getSeedBalanceMultiplier(agent.kind, agent.login)
        )
      );
    })
  );

  console.log("AI market agents are ready:");
  console.log(
    AI_MARKET_AGENT_USER_SEEDS.map((agent) => agent.login).join(", ")
  );
  console.log("Financial market pairs are ready.");
  console.log("Financial accounts are ready.");
}

main()
  .catch((error) => {
    console.error("Failed to seed AI market agents.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
