import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.EXCHANGE_STORAGE_DATABASE_URL;

if (!connectionString) {
  throw new Error("EXCHANGE_STORAGE_DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const login = process.env.SEED_USER_LOGIN ?? "admin";
const password = process.env.SEED_USER_PASSWORD ?? "admin12345";
const counterpartyLogin = process.env.SEED_COUNTERPARTY_LOGIN ?? "analyst";
const counterpartyPassword =
  process.env.SEED_COUNTERPARTY_PASSWORD ?? "analyst12345";

type FinancialAccountSeed = {
  asset: "RUB" | "USD" | "XCP";
  balance: number;
};

const financialAccountSeeds = [
  {
    asset: "RUB",
    balance: 125_000,
  },
  {
    asset: "USD",
    balance: 1_250,
  },
  {
    asset: "XCP",
    balance: 350,
  },
] satisfies FinancialAccountSeed[];

const counterpartyFinancialAccountSeeds = [
  {
    asset: "RUB",
    balance: 72_500,
  },
  {
    asset: "USD",
    balance: 640,
  },
  {
    asset: "XCP",
    balance: 180,
  },
] satisfies FinancialAccountSeed[];

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
        },
        create: {
          asset: account.asset,
          balance: decimal(account.balance),
          userId,
        },
      })
    )
  );
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
        amount: decimal(12_500),
        asset: "RUB",
        creatorUserId: counterpartyUser.id,
      },
      {
        amount: decimal(150),
        asset: "USD",
        creatorUserId: user.id,
      },
      {
        amount: decimal(25),
        asset: "XCP",
        creatorUserId: counterpartyUser.id,
        acceptedAt: new Date("2026-04-02T10:00:00.000Z"),
        acceptedByUserId: user.id,
        status: "ACCEPTED",
      },
      {
        amount: decimal(3_000),
        asset: "RUB",
        creatorUserId: user.id,
        status: "CANCELLED",
      },
    ],
  });

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
    {
      portfolioId: portfolio.id,
      type: "CURRENCY",
      ticker: null,
      currencyCode: "USD",
      quantity: decimal(320),
      averagePrice: null,
      averageRate: decimal(91.4),
    },
    {
      portfolioId: portfolio.id,
      type: "CURRENCY",
      ticker: null,
      currencyCode: "CNY",
      quantity: decimal(1800),
      averagePrice: null,
      averageRate: decimal(12.55),
    },
  ] satisfies Prisma.PortfolioPositionCreateManyInput[];

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
      type: "FX_BUY",
      ticker: null,
      currencyCode: "USD",
      quantity: decimal(320),
      price: decimal(91.4),
      amount: decimal(29248),
      feeAmount: decimal(30),
      executedAt: new Date("2026-03-29T09:15:00.000Z"),
    },
    {
      portfolioId: portfolio.id,
      type: "FX_BUY",
      ticker: null,
      currencyCode: "CNY",
      quantity: decimal(1800),
      price: decimal(12.55),
      amount: decimal(22590),
      feeAmount: decimal(25),
      executedAt: new Date("2026-03-30T10:20:00.000Z"),
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
