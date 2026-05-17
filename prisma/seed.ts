import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.XC_COPILOT_DATABASE_URL;

if (!connectionString) {
  throw new Error("XC_COPILOT_DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const login = process.env.SEED_USER_LOGIN ?? "admin";
const password = process.env.SEED_USER_PASSWORD ?? "admin12345";
const counterpartyLogin = process.env.SEED_COUNTERPARTY_LOGIN ?? "analyst";
const counterpartyPassword =
  process.env.SEED_COUNTERPARTY_PASSWORD ?? "analyst12345";

type FinancialAccountSeed = {
  asset: "RUB" | "USD" | "EUR" | "CNY" | "XCP";
  balance: number;
};

type FinancialMarketPairSeed = {
  amountPrecision: number;
  baseAsset: FinancialAccountSeed["asset"];
  label: string;
  pricePrecision: number;
  quoteAsset: FinancialAccountSeed["asset"];
  sortOrder: number;
  symbol: string;
};

type BrokerageCashBalanceSeed = {
  averageRate: number | null;
  balance: number;
  currency: "RUB" | "USD" | "EUR" | "CNY";
};

const financialAccountSeeds = [
  {
    asset: "RUB",
    balance: 300_000,
  },
  {
    asset: "USD",
    balance: 3_000,
  },
  {
    asset: "EUR",
    balance: 1_500,
  },
  {
    asset: "CNY",
    balance: 12_000,
  },
  {
    asset: "XCP",
    balance: 500,
  },
] satisfies FinancialAccountSeed[];

const counterpartyFinancialAccountSeeds = [
  {
    asset: "RUB",
    balance: 300_000,
  },
  {
    asset: "USD",
    balance: 3_000,
  },
  {
    asset: "EUR",
    balance: 1_500,
  },
  {
    asset: "CNY",
    balance: 12_000,
  },
  {
    asset: "XCP",
    balance: 300,
  },
] satisfies FinancialAccountSeed[];

const financialMarketPairSeeds = [
  {
    amountPrecision: 2,
    baseAsset: "XCP",
    label: "XCP/RUB",
    pricePrecision: 2,
    quoteAsset: "RUB",
    sortOrder: 10,
    symbol: "XCP/RUB",
  },
  {
    amountPrecision: 2,
    baseAsset: "USD",
    label: "USD/RUB",
    pricePrecision: 4,
    quoteAsset: "RUB",
    sortOrder: 20,
    symbol: "USD/RUB",
  },
  {
    amountPrecision: 2,
    baseAsset: "XCP",
    label: "XCP/USD",
    pricePrecision: 4,
    quoteAsset: "USD",
    sortOrder: 25,
    symbol: "XCP/USD",
  },
  {
    amountPrecision: 2,
    baseAsset: "EUR",
    label: "EUR/RUB",
    pricePrecision: 4,
    quoteAsset: "RUB",
    sortOrder: 30,
    symbol: "EUR/RUB",
  },
  {
    amountPrecision: 2,
    baseAsset: "EUR",
    label: "EUR/USD",
    pricePrecision: 5,
    quoteAsset: "USD",
    sortOrder: 35,
    symbol: "EUR/USD",
  },
  {
    amountPrecision: 2,
    baseAsset: "CNY",
    label: "CNY/RUB",
    pricePrecision: 4,
    quoteAsset: "RUB",
    sortOrder: 40,
    symbol: "CNY/RUB",
  },
  {
    amountPrecision: 2,
    baseAsset: "CNY",
    label: "CNY/USD",
    pricePrecision: 5,
    quoteAsset: "USD",
    sortOrder: 45,
    symbol: "CNY/USD",
  },
] satisfies FinancialMarketPairSeed[];

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(8));
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
        update: {
          balance: decimal(account.balance),
          lockedBalance: decimal(0),
        },
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

async function upsertFinancialMarketPairs() {
  const pairs = await Promise.all(
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

  return new Map(pairs.map((pair) => [pair.symbol, pair]));
}

async function lockFinancialAccount(params: {
  amount: number;
  asset: FinancialAccountSeed["asset"];
  userId: string;
}) {
  await prisma.financialAccount.update({
    where: {
      userId_asset: {
        asset: params.asset,
        userId: params.userId,
      },
    },
    data: {
      balance: {
        decrement: decimal(params.amount),
      },
      lockedBalance: {
        increment: decimal(params.amount),
      },
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const counterpartyPasswordHash = await bcrypt.hash(counterpartyPassword, 12);

  const user = await prisma.user.upsert({
    where: { login },
    update: {
      passwordHash,
    },
    create: {
      login,
      passwordHash,
    },
  });
  const counterpartyUser = await prisma.user.upsert({
    where: { login: counterpartyLogin },
    update: {
      passwordHash: counterpartyPasswordHash,
    },
    create: {
      login: counterpartyLogin,
      passwordHash: counterpartyPasswordHash,
    },
  });

  await prisma.financialOrder.deleteMany({
    where: {
      OR: [
        { creatorUserId: user.id },
        { acceptedByUserId: user.id },
        { creatorUserId: counterpartyUser.id },
        { acceptedByUserId: counterpartyUser.id },
      ],
    },
  });
  await prisma.financialTrade.deleteMany({
    where: {
      OR: [
        { buyerUserId: user.id },
        { sellerUserId: user.id },
        { buyerUserId: counterpartyUser.id },
        { sellerUserId: counterpartyUser.id },
      ],
    },
  });

  const marketPairs = await upsertFinancialMarketPairs();
  const xcpRubPair = marketPairs.get("XCP/RUB");
  const usdRubPair = marketPairs.get("USD/RUB");
  const xcpUsdPair = marketPairs.get("XCP/USD");
  const eurRubPair = marketPairs.get("EUR/RUB");
  const eurUsdPair = marketPairs.get("EUR/USD");
  const cnyRubPair = marketPairs.get("CNY/RUB");
  const cnyUsdPair = marketPairs.get("CNY/USD");

  if (
    !xcpRubPair ||
    !usdRubPair ||
    !xcpUsdPair ||
    !eurRubPair ||
    !eurUsdPair ||
    !cnyRubPair ||
    !cnyUsdPair
  ) {
    throw new Error("Failed to seed financial market pairs.");
  }

  await Promise.all([
    upsertFinancialAccounts(user.id, financialAccountSeeds),
    upsertFinancialAccounts(
      counterpartyUser.id,
      counterpartyFinancialAccountSeeds
    ),
  ]);

  await prisma.financialOrder.createMany({
    data: [
      {
        amount: decimal(80),
        asset: "XCP",
        creatorUserId: counterpartyUser.id,
        pairId: xcpRubPair.id,
        price: decimal(95),
        quoteAsset: "RUB",
        side: "BUY",
      },
      {
        amount: decimal(30),
        asset: "XCP",
        creatorUserId: user.id,
        pairId: xcpRubPair.id,
        price: decimal(110),
        quoteAsset: "RUB",
        side: "SELL",
      },
      {
        amount: decimal(500),
        asset: "USD",
        creatorUserId: counterpartyUser.id,
        pairId: usdRubPair.id,
        price: decimal(93.2),
        quoteAsset: "RUB",
        side: "SELL",
      },
      {
        amount: decimal(200),
        asset: "USD",
        creatorUserId: user.id,
        pairId: usdRubPair.id,
        price: decimal(91.7),
        quoteAsset: "RUB",
        side: "BUY",
      },
      {
        amount: decimal(300),
        asset: "EUR",
        creatorUserId: counterpartyUser.id,
        pairId: eurRubPair.id,
        price: decimal(101.8),
        quoteAsset: "RUB",
        side: "SELL",
      },
      {
        amount: decimal(40),
        asset: "XCP",
        creatorUserId: counterpartyUser.id,
        pairId: xcpUsdPair.id,
        price: decimal(1.08),
        quoteAsset: "USD",
        side: "SELL",
      },
      {
        amount: decimal(60),
        asset: "XCP",
        creatorUserId: user.id,
        pairId: xcpUsdPair.id,
        price: decimal(0.96),
        quoteAsset: "USD",
        side: "BUY",
      },
      {
        amount: decimal(250),
        asset: "EUR",
        creatorUserId: counterpartyUser.id,
        pairId: eurUsdPair.id,
        price: decimal(1.095),
        quoteAsset: "USD",
        side: "SELL",
      },
      {
        amount: decimal(150),
        asset: "EUR",
        creatorUserId: user.id,
        pairId: eurUsdPair.id,
        price: decimal(1.071),
        quoteAsset: "USD",
        side: "BUY",
      },
      {
        amount: decimal(3_000),
        asset: "CNY",
        creatorUserId: user.id,
        pairId: cnyRubPair.id,
        price: decimal(12.65),
        quoteAsset: "RUB",
        side: "BUY",
      },
      {
        amount: decimal(2_500),
        asset: "CNY",
        creatorUserId: counterpartyUser.id,
        pairId: cnyRubPair.id,
        price: decimal(12.9),
        quoteAsset: "RUB",
        side: "SELL",
      },
      {
        amount: decimal(4_000),
        asset: "CNY",
        creatorUserId: counterpartyUser.id,
        pairId: cnyUsdPair.id,
        price: decimal(0.141),
        quoteAsset: "USD",
        side: "SELL",
      },
      {
        amount: decimal(2_000),
        asset: "CNY",
        creatorUserId: user.id,
        pairId: cnyUsdPair.id,
        price: decimal(0.136),
        quoteAsset: "USD",
        side: "BUY",
      },
      {
        amount: decimal(25),
        asset: "XCP",
        creatorUserId: counterpartyUser.id,
        filledAmount: decimal(25),
        pairId: xcpRubPair.id,
        price: decimal(100),
        quoteAsset: "RUB",
        side: "SELL",
        acceptedAt: new Date("2026-04-02T10:00:00.000Z"),
        acceptedByUserId: user.id,
        status: "ACCEPTED",
      },
      {
        amount: decimal(20),
        asset: "XCP",
        creatorUserId: user.id,
        pairId: xcpRubPair.id,
        price: decimal(120),
        quoteAsset: "RUB",
        side: "BUY",
        status: "CANCELLED",
      },
    ],
  });

  await prisma.financialTrade.create({
    data: {
      amount: decimal(25),
      asset: "XCP",
      buyOrderId: "seed-buy-xcp-rub",
      buyerUserId: user.id,
      pairId: xcpRubPair.id,
      price: decimal(100),
      quoteAmount: decimal(2_500),
      quoteAsset: "RUB",
      sellOrderId: "seed-sell-xcp-rub",
      sellerUserId: counterpartyUser.id,
    },
  });

  await Promise.all([
    lockFinancialAccount({
      amount: 7_600,
      asset: "RUB",
      userId: counterpartyUser.id,
    }),
    lockFinancialAccount({
      amount: 30,
      asset: "XCP",
      userId: user.id,
    }),
    lockFinancialAccount({
      amount: 500,
      asset: "USD",
      userId: counterpartyUser.id,
    }),
    lockFinancialAccount({
      amount: 18_340,
      asset: "RUB",
      userId: user.id,
    }),
    lockFinancialAccount({
      amount: 300,
      asset: "EUR",
      userId: counterpartyUser.id,
    }),
    lockFinancialAccount({
      amount: 40,
      asset: "XCP",
      userId: counterpartyUser.id,
    }),
    lockFinancialAccount({
      amount: 57.6,
      asset: "USD",
      userId: user.id,
    }),
    lockFinancialAccount({
      amount: 250,
      asset: "EUR",
      userId: counterpartyUser.id,
    }),
    lockFinancialAccount({
      amount: 160.65,
      asset: "USD",
      userId: user.id,
    }),
    lockFinancialAccount({
      amount: 37_950,
      asset: "RUB",
      userId: user.id,
    }),
    lockFinancialAccount({
      amount: 2_500,
      asset: "CNY",
      userId: counterpartyUser.id,
    }),
    lockFinancialAccount({
      amount: 4_000,
      asset: "CNY",
      userId: counterpartyUser.id,
    }),
    lockFinancialAccount({
      amount: 272,
      asset: "USD",
      userId: user.id,
    }),
  ]);

  const portfolio = await prisma.portfolio.upsert({
    where: { userId: user.id },
    update: {
      cashBalance: decimal(154486.8),
    },
    create: {
      userId: user.id,
      cashBalance: decimal(154486.8),
    },
  });

  await prisma.$transaction([
    prisma.brokerageCashBalance.deleteMany({
      where: { portfolioId: portfolio.id },
    }),
    prisma.portfolioPosition.deleteMany({
      where: { portfolioId: portfolio.id },
    }),
    prisma.portfolioTransaction.deleteMany({
      where: { portfolioId: portfolio.id },
    }),
  ]);

  const positionSeeds = [
    {
      portfolioId: portfolio.id,
      type: "STOCK",
      ticker: "SBER",
      currencyCode: null,
      quantity: decimal(14),
      averagePrice: decimal(292.4),
      averageRate: null,
    },
    {
      portfolioId: portfolio.id,
      type: "STOCK",
      ticker: "LKOH",
      currencyCode: null,
      quantity: decimal(3),
      averagePrice: decimal(7148.3),
      averageRate: null,
    },
    {
      portfolioId: portfolio.id,
      type: "STOCK",
      ticker: "TATN",
      currencyCode: null,
      quantity: decimal(12),
      averagePrice: decimal(672.8),
      averageRate: null,
    },
  ] satisfies Prisma.PortfolioPositionCreateManyInput[];

  const brokerageCashBalanceSeeds = [
    {
      currency: "RUB",
      balance: 154486.8,
      averageRate: 1,
    },
    {
      currency: "USD",
      balance: 320,
      averageRate: 91.4,
    },
  ] satisfies BrokerageCashBalanceSeed[];

  const transactionSeeds = [
    {
      portfolioId: portfolio.id,
      type: "DEPOSIT",
      ticker: null,
      currencyCode: null,
      quantity: null,
      price: null,
      amount: decimal(240000),
      feeAmount: decimal(0),
      executedAt: new Date("2026-03-25T08:30:00.000Z"),
    },
    {
      portfolioId: portfolio.id,
      type: "BUY",
      ticker: "SBER",
      currencyCode: null,
      quantity: decimal(18),
      price: decimal(292.4),
      amount: decimal(5263.2),
      feeAmount: decimal(12.5),
      executedAt: new Date("2026-03-26T10:00:00.000Z"),
    },
    {
      portfolioId: portfolio.id,
      type: "BUY",
      ticker: "LKOH",
      currencyCode: null,
      quantity: decimal(3),
      price: decimal(7148.3),
      amount: decimal(21444.9),
      feeAmount: decimal(21),
      executedAt: new Date("2026-03-27T10:40:00.000Z"),
    },
    {
      portfolioId: portfolio.id,
      type: "BUY",
      ticker: "TATN",
      currencyCode: null,
      quantity: decimal(12),
      price: decimal(672.8),
      amount: decimal(8073.6),
      feeAmount: decimal(15),
      executedAt: new Date("2026-03-28T12:00:00.000Z"),
    },
    {
      portfolioId: portfolio.id,
      type: "SELL",
      ticker: "SBER",
      currencyCode: null,
      quantity: decimal(4),
      price: decimal(305),
      amount: decimal(1220),
      feeAmount: decimal(10),
      executedAt: new Date("2026-04-01T11:05:00.000Z"),
    },
  ] satisfies Prisma.PortfolioTransactionCreateManyInput[];

  await prisma.portfolioPosition.createMany({
    data: positionSeeds,
  });

  await prisma.brokerageCashBalance.createMany({
    data: brokerageCashBalanceSeeds.map((cashBalance) => ({
      portfolioId: portfolio.id,
      currency: cashBalance.currency,
      balance: decimal(cashBalance.balance),
      averageRate:
        cashBalance.averageRate == null
          ? null
          : decimal(cashBalance.averageRate),
    })),
  });

  await prisma.portfolioTransaction.createMany({
    data: transactionSeeds,
  });

  console.log("Seed user is ready:");
  console.log(`login: ${login}`);
  console.log(`password: ${password}`);
  console.log("Seed counterparty user is ready:");
  console.log(`login: ${counterpartyLogin}`);
  console.log(`password: ${counterpartyPassword}`);
  console.log("Seed financial accounts are ready.");
  console.log("Seed financial orders are ready.");
  console.log("Seed portfolio is ready.");
  console.log(`portfolioId: ${portfolio.id}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed database.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
