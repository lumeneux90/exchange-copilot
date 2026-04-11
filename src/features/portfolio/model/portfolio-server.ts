import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/src/lib/db";
import type { PortfolioState } from "@/src/features/portfolio/model/types";

const DECIMAL_SCALE = 8;
const POSITION_EPSILON = 0.000001;

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(DECIMAL_SCALE));
}

function mapPortfolioState(portfolio: {
  cashBalance: Prisma.Decimal;
  positions: Array<{
    type: "STOCK" | "CURRENCY";
    ticker: string | null;
    currencyCode: string | null;
    quantity: Prisma.Decimal;
    averagePrice: Prisma.Decimal | null;
    averageRate: Prisma.Decimal | null;
  }>;
}): PortfolioState {
  const holdings = portfolio.positions
    .filter((position) => position.type === "STOCK" && position.ticker)
    .map((position) => ({
      ticker: position.ticker!,
      quantity: toNumber(position.quantity),
      averagePrice: toNumber(position.averagePrice),
    }))
    .sort((left, right) => left.ticker.localeCompare(right.ticker));

  const currencies = portfolio.positions
    .filter((position) => position.type === "CURRENCY" && position.currencyCode)
    .map((position) => ({
      code: position.currencyCode!,
      quantity: toNumber(position.quantity),
      averageRate: toNumber(position.averageRate),
    }))
    .sort((left, right) => left.code.localeCompare(right.code));

  return {
    cashBalance: toNumber(portfolio.cashBalance),
    currencies,
    holdings,
  };
}

async function getOrCreatePortfolioRecord(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string
) {
  const existingPortfolio = await db.portfolio.findUnique({
    where: { userId },
    include: {
      positions: true,
    },
  });

  if (existingPortfolio) {
    return existingPortfolio;
  }

  return db.portfolio.create({
    data: {
      userId,
    },
    include: {
      positions: true,
    },
  });
}

export async function getPortfolioState(userId: string) {
  const portfolio = await getOrCreatePortfolioRecord(prisma, userId);

  return mapPortfolioState(portfolio);
}

export async function depositFunds(params: {
  userId: string;
  amount: number;
}) {
  const { amount, userId } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Некорректная сумма пополнения.");
  }

  const portfolio = await prisma.$transaction(async (tx) => {
    const currentPortfolio = await getOrCreatePortfolioRecord(tx, userId);

    return tx.portfolio.update({
      where: { id: currentPortfolio.id },
      data: {
        cashBalance: {
          increment: toDecimal(amount),
        },
      },
      include: {
        positions: true,
      },
    });
  });

  return mapPortfolioState(portfolio);
}

export async function tradeCurrency(params: {
  userId: string;
  code: string;
  side: "buy" | "sell";
  amount: number;
  rate: number;
}) {
  const { amount, code, rate, side, userId } = params;

  if (!code || !Number.isFinite(amount) || amount <= 0 || rate <= 0) {
    throw new Error("Некорректные параметры валютной сделки.");
  }

  const normalizedCode = code.trim().toUpperCase();

  const portfolio = await prisma.$transaction(async (tx) => {
    const currentPortfolio = await getOrCreatePortfolioRecord(tx, userId);
    const currentCashBalance = toNumber(currentPortfolio.cashBalance);
    const currentPosition = currentPortfolio.positions.find(
      (position) =>
        position.type === "CURRENCY" &&
        position.currencyCode === normalizedCode
    );
    const currentQuantity = toNumber(currentPosition?.quantity);
    const currentAverageRate = toNumber(currentPosition?.averageRate);

    if (side === "buy") {
      const rubAmount = amount;
      const fxQuantity = amount / rate;

      if (currentCashBalance + Number.EPSILON < rubAmount) {
        throw new Error("Недостаточно рублей для покупки валюты.");
      }

      const nextQuantity = currentQuantity + fxQuantity;
      const nextAverageRate =
        nextQuantity > 0
          ? (currentAverageRate * currentQuantity + rubAmount) / nextQuantity
          : rate;

      if (currentPosition) {
        await tx.portfolioPosition.update({
          where: { id: currentPosition.id },
          data: {
            quantity: toDecimal(nextQuantity),
            averageRate: toDecimal(nextAverageRate),
          },
        });
      } else {
        await tx.portfolioPosition.create({
          data: {
            portfolioId: currentPortfolio.id,
            type: "CURRENCY",
            currencyCode: normalizedCode,
            quantity: toDecimal(nextQuantity),
            averageRate: toDecimal(nextAverageRate),
          },
        });
      }

      await tx.portfolio.update({
        where: { id: currentPortfolio.id },
        data: {
          cashBalance: {
            decrement: toDecimal(rubAmount),
          },
        },
      });
    } else {
      const fxQuantity = amount;
      const rubAmount = amount * rate;

      if (currentQuantity + Number.EPSILON < fxQuantity) {
        throw new Error("Недостаточно валюты для продажи.");
      }

      const nextQuantity = currentQuantity - fxQuantity;

      if (nextQuantity <= POSITION_EPSILON) {
        if (currentPosition) {
          await tx.portfolioPosition.delete({
            where: { id: currentPosition.id },
          });
        }
      } else if (currentPosition) {
        await tx.portfolioPosition.update({
          where: { id: currentPosition.id },
          data: {
            quantity: toDecimal(nextQuantity),
          },
        });
      }

      await tx.portfolio.update({
        where: { id: currentPortfolio.id },
        data: {
          cashBalance: {
            increment: toDecimal(rubAmount),
          },
        },
      });
    }

    return tx.portfolio.findUniqueOrThrow({
      where: { id: currentPortfolio.id },
      include: {
        positions: true,
      },
    });
  });

  return mapPortfolioState(portfolio);
}

export async function tradeStock(params: {
  userId: string;
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee?: number;
}) {
  const { fee = 0, price, quantity, side, ticker, userId } = params;

  if (
    !ticker ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(fee) ||
    fee < 0
  ) {
    throw new Error("Некорректные параметры сделки по акции.");
  }

  const normalizedTicker = ticker.trim().toUpperCase();

  const portfolio = await prisma.$transaction(async (tx) => {
    const currentPortfolio = await getOrCreatePortfolioRecord(tx, userId);
    const currentCashBalance = toNumber(currentPortfolio.cashBalance);
    const currentPosition = currentPortfolio.positions.find(
      (position) =>
        position.type === "STOCK" && position.ticker === normalizedTicker
    );
    const currentQuantity = toNumber(currentPosition?.quantity);
    const currentAveragePrice = toNumber(currentPosition?.averagePrice);

    if (side === "buy") {
      const totalCost = quantity * price + fee;

      if (currentCashBalance + Number.EPSILON < totalCost) {
        throw new Error("Недостаточно средств для покупки акции.");
      }

      const nextQuantity = currentQuantity + quantity;
      const nextAveragePrice =
        nextQuantity > 0
          ? (currentAveragePrice * currentQuantity + quantity * price + fee) /
            nextQuantity
          : price;

      if (currentPosition) {
        await tx.portfolioPosition.update({
          where: { id: currentPosition.id },
          data: {
            quantity: toDecimal(nextQuantity),
            averagePrice: toDecimal(nextAveragePrice),
          },
        });
      } else {
        await tx.portfolioPosition.create({
          data: {
            portfolioId: currentPortfolio.id,
            type: "STOCK",
            ticker: normalizedTicker,
            quantity: toDecimal(nextQuantity),
            averagePrice: toDecimal(nextAveragePrice),
          },
        });
      }

      await tx.portfolio.update({
        where: { id: currentPortfolio.id },
        data: {
          cashBalance: {
            decrement: toDecimal(totalCost),
          },
        },
      });
    } else {
      const proceeds = quantity * price - fee;

      if (currentQuantity + Number.EPSILON < quantity) {
        throw new Error("Недостаточно бумаг для продажи.");
      }

      const nextQuantity = currentQuantity - quantity;

      if (nextQuantity <= POSITION_EPSILON) {
        if (currentPosition) {
          await tx.portfolioPosition.delete({
            where: { id: currentPosition.id },
          });
        }
      } else if (currentPosition) {
        await tx.portfolioPosition.update({
          where: { id: currentPosition.id },
          data: {
            quantity: toDecimal(nextQuantity),
          },
        });
      }

      await tx.portfolio.update({
        where: { id: currentPortfolio.id },
        data: {
          cashBalance: {
            increment: toDecimal(proceeds),
          },
        },
      });
    }

    return tx.portfolio.findUniqueOrThrow({
      where: { id: currentPortfolio.id },
      include: {
        positions: true,
      },
    });
  });

  return mapPortfolioState(portfolio);
}
