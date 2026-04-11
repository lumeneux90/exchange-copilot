import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PortfolioPositionType,
  PortfolioTransactionType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const login = process.env.SEED_USER_LOGIN ?? "admin";
const password = process.env.SEED_USER_PASSWORD ?? "admin12345";

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(8));
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

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
      type: PortfolioPositionType.STOCK,
      ticker: "SBER",
      currencyCode: null,
      quantity: decimal(14),
      averagePrice: decimal(292.4),
      averageRate: null,
    },
    {
      portfolioId: portfolio.id,
      type: PortfolioPositionType.STOCK,
      ticker: "LKOH",
      currencyCode: null,
      quantity: decimal(3),
      averagePrice: decimal(7148.3),
      averageRate: null,
    },
    {
      portfolioId: portfolio.id,
      type: PortfolioPositionType.STOCK,
      ticker: "TATN",
      currencyCode: null,
      quantity: decimal(12),
      averagePrice: decimal(672.8),
      averageRate: null,
    },
    {
      portfolioId: portfolio.id,
      type: PortfolioPositionType.CURRENCY,
      ticker: null,
      currencyCode: "USD",
      quantity: decimal(320),
      averagePrice: null,
      averageRate: decimal(91.4),
    },
    {
      portfolioId: portfolio.id,
      type: PortfolioPositionType.CURRENCY,
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
      type: PortfolioTransactionType.DEPOSIT,
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
      type: PortfolioTransactionType.BUY,
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
      type: PortfolioTransactionType.BUY,
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
      type: PortfolioTransactionType.BUY,
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
      type: PortfolioTransactionType.FX_BUY,
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
      type: PortfolioTransactionType.FX_BUY,
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
      type: PortfolioTransactionType.SELL,
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
