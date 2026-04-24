import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import type {
  PortfolioHistoryItem,
  PortfolioHistoryPage,
} from "@/src/features/portfolio/model/history";
import { isActiveFxCurrencyCode } from "@/src/entities/market/model/currencies";
import type { Stock } from "@/src/entities/stock/model/types";
import { calculateFxTradeFee } from "@/src/features/portfolio/model/fx-trade-fees";
import { getStockMarketStatus } from "@/src/features/portfolio/model/market-hours";
import { calculateStockTradeFee } from "@/src/features/portfolio/model/stock-trade-fees";
import {
  getWindowStart,
  getRemainingCooldownMinutes,
  MAX_DEPOSIT_AMOUNT,
  MONTHLY_DEPOSIT_LIMIT,
  MONTHLY_DEPOSIT_WINDOW_DAYS,
  MIN_DEPOSIT_AMOUNT,
  WEEKLY_DEPOSIT_LIMIT,
  WEEKLY_DEPOSIT_WINDOW_DAYS,
} from "@/src/features/portfolio/model/deposit-rules";
import { getPrisma } from "@/src/lib/db";
import type { PortfolioState } from "@/src/features/portfolio/model/types";

const DECIMAL_SCALE = 8;
const POSITION_EPSILON = 0.000001;
const DEFAULT_HISTORY_PAGE_SIZE = 25;
const MAX_HISTORY_PAGE_SIZE = 100;

export type PortfolioLeaderboardItem = {
  cashBalance: number;
  currencyPositionsCount: number;
  holdingsCount: number;
  investedAmount: number;
  login: string;
  rank: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  totalValue: number;
  userId: string;
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(DECIMAL_SCALE));
}

function mapPortfolioTransaction(transaction: {
  id: string;
  type: "DEPOSIT" | "BUY" | "SELL" | "FX_BUY" | "FX_SELL";
  ticker: string | null;
  currencyCode: string | null;
  quantity: Prisma.Decimal | null;
  price: Prisma.Decimal | null;
  amount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  executedAt: Date;
}): PortfolioHistoryItem {
  return {
    id: transaction.id,
    type: transaction.type,
    ticker: transaction.ticker,
    currencyCode: transaction.currencyCode,
    quantity:
      transaction.quantity == null ? null : toNumber(transaction.quantity),
    price: transaction.price == null ? null : toNumber(transaction.price),
    amount: toNumber(transaction.amount),
    feeAmount: toNumber(transaction.feeAmount),
    executedAt: transaction.executedAt.toISOString(),
  };
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
  const prisma = getPrisma();
  const portfolio = await getOrCreatePortfolioRecord(prisma, userId);

  return mapPortfolioState(portfolio);
}

export async function getPortfolioHistory(userId: string) {
  const prisma = getPrisma();
  const portfolio = await getOrCreatePortfolioRecord(prisma, userId);
  const transactions = await prisma.portfolioTransaction.findMany({
    where: {
      portfolioId: portfolio.id,
    },
    orderBy: [{ executedAt: "desc" }, { createdAt: "desc" }],
  });

  return transactions.map(mapPortfolioTransaction);
}

export async function getPortfolioHistoryPage(
  userId: string,
  options: {
    page?: number;
    pageSize?: number;
  } = {}
): Promise<PortfolioHistoryPage> {
  const prisma = getPrisma();
  const portfolio = await getOrCreatePortfolioRecord(prisma, userId);
  const pageSize = Math.min(
    MAX_HISTORY_PAGE_SIZE,
    Math.max(1, Math.floor(options.pageSize ?? DEFAULT_HISTORY_PAGE_SIZE))
  );
  const requestedPage = Math.max(1, Math.floor(options.page ?? 1));
  const totalItems = await prisma.portfolioTransaction.count({
    where: {
      portfolioId: portfolio.id,
    },
  });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const transactions =
    totalItems === 0
      ? []
      : await prisma.portfolioTransaction.findMany({
          where: {
            portfolioId: portfolio.id,
          },
          orderBy: [{ executedAt: "desc" }, { createdAt: "desc" }],
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
        });

  return {
    currentPage,
    items: transactions.map(mapPortfolioTransaction),
    pageSize,
    totalItems,
    totalPages,
  };
}

export async function getPortfolioLeaderboard(
  stocks: Stock[],
  currencyRates: CurrencyRate[]
): Promise<PortfolioLeaderboardItem[]> {
  const prisma = getPrisma();
  const pricesByTicker = new Map(stocks.map((stock) => [stock.ticker, stock]));
  const ratesByCode = new Map(
    currencyRates.map((rate) => [rate.label.split("/")[0] ?? rate.code, rate])
  );
  const users = await prisma.user.findMany({
    include: {
      portfolio: {
        include: {
          positions: true,
        },
      },
    },
    orderBy: {
      login: "asc",
    },
  });

  const leaderboard = users.map((user) => {
    const portfolio = user.portfolio;
    const positions = portfolio?.positions ?? [];
    const cashBalance = toNumber(portfolio?.cashBalance);
    let holdingsValue = 0;
    let holdingsCostBasis = 0;
    let currenciesValue = 0;
    let currenciesCostBasis = 0;
    let holdingsCount = 0;
    let currencyPositionsCount = 0;

    for (const position of positions) {
      const quantity = toNumber(position.quantity);

      if (position.type === "STOCK" && position.ticker) {
        const currentPrice =
          pricesByTicker.get(position.ticker)?.price ??
          toNumber(position.averagePrice);
        const averagePrice = toNumber(position.averagePrice);

        holdingsCount += 1;
        holdingsValue += currentPrice * quantity;
        holdingsCostBasis += averagePrice * quantity;
      }

      if (position.type === "CURRENCY" && position.currencyCode) {
        const currentRate =
          ratesByCode.get(position.currencyCode)?.price ??
          toNumber(position.averageRate);
        const averageRate = toNumber(position.averageRate);

        currencyPositionsCount += 1;
        currenciesValue += currentRate * quantity;
        currenciesCostBasis += averageRate * quantity;
      }
    }

    const investedAmount = holdingsCostBasis + currenciesCostBasis;
    const totalProfitLoss = holdingsValue + currenciesValue - investedAmount;
    const totalProfitLossPercent =
      investedAmount > 0 ? (totalProfitLoss / investedAmount) * 100 : 0;

    return {
      cashBalance,
      currencyPositionsCount,
      holdingsCount,
      login: user.login,
      rank: 0,
      totalProfitLoss,
      totalProfitLossPercent,
      totalValue: cashBalance + holdingsValue + currenciesValue,
      investedAmount,
      userId: user.id,
    };
  });

  return leaderboard
    .sort((left, right) => {
      const leftHasInvestments = left.investedAmount > 0;
      const rightHasInvestments = right.investedAmount > 0;

      if (leftHasInvestments !== rightHasInvestments) {
        return leftHasInvestments ? -1 : 1;
      }

      return (
        right.totalProfitLossPercent - left.totalProfitLossPercent ||
        right.totalProfitLoss - left.totalProfitLoss ||
        right.totalValue - left.totalValue
      );
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}

export async function depositFunds(params: { userId: string; amount: number }) {
  const prisma = getPrisma();
  const { amount, userId } = params;

  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_AMOUNT) {
    throw new Error("Некорректная сумма пополнения.");
  }

  if (amount > MAX_DEPOSIT_AMOUNT) {
    throw new Error(
      `Сумма одного пополнения не должна превышать ${MAX_DEPOSIT_AMOUNT.toLocaleString(
        "ru-RU"
      )} RUB.`
    );
  }

  const portfolio = await prisma.$transaction(async (tx) => {
    const currentPortfolio = await getOrCreatePortfolioRecord(tx, userId);
    const now = new Date();
    const lastDeposit = await tx.portfolioTransaction.findFirst({
      where: {
        portfolioId: currentPortfolio.id,
        type: "DEPOSIT",
      },
      orderBy: [{ executedAt: "desc" }, { createdAt: "desc" }],
      select: {
        executedAt: true,
      },
    });

    if (lastDeposit) {
      const remainingCooldownMinutes = getRemainingCooldownMinutes(
        lastDeposit.executedAt
      );

      if (remainingCooldownMinutes > 0) {
        throw new Error(
          `Слишком частые пополнения. Следующее пополнение будет доступно примерно через ${remainingCooldownMinutes} мин.`
        );
      }
    }

    const [weeklyDeposits, monthlyDeposits] = await Promise.all([
      tx.portfolioTransaction.aggregate({
        where: {
          portfolioId: currentPortfolio.id,
          type: "DEPOSIT",
          executedAt: {
            gte: getWindowStart(WEEKLY_DEPOSIT_WINDOW_DAYS, now),
          },
        },
        _sum: {
          amount: true,
        },
      }),
      tx.portfolioTransaction.aggregate({
        where: {
          portfolioId: currentPortfolio.id,
          type: "DEPOSIT",
          executedAt: {
            gte: getWindowStart(MONTHLY_DEPOSIT_WINDOW_DAYS, now),
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const weeklyAmount = toNumber(weeklyDeposits._sum.amount);
    const monthlyAmount = toNumber(monthlyDeposits._sum.amount);

    if (weeklyAmount + amount > WEEKLY_DEPOSIT_LIMIT) {
      const remainingWeeklyLimit = Math.max(
        0,
        WEEKLY_DEPOSIT_LIMIT - weeklyAmount
      );

      throw new Error(
        `Превышен лимит пополнений за 7 дней. Доступно еще ${remainingWeeklyLimit.toLocaleString(
          "ru-RU"
        )} RUB из ${WEEKLY_DEPOSIT_LIMIT.toLocaleString("ru-RU")} RUB.`
      );
    }

    if (monthlyAmount + amount > MONTHLY_DEPOSIT_LIMIT) {
      const remainingMonthlyLimit = Math.max(
        0,
        MONTHLY_DEPOSIT_LIMIT - monthlyAmount
      );

      throw new Error(
        `Превышен лимит пополнений за 30 дней. Доступно еще ${remainingMonthlyLimit.toLocaleString(
          "ru-RU"
        )} RUB из ${MONTHLY_DEPOSIT_LIMIT.toLocaleString("ru-RU")} RUB.`
      );
    }

    await tx.portfolioTransaction.create({
      data: {
        portfolioId: currentPortfolio.id,
        type: "DEPOSIT",
        amount: toDecimal(amount),
        executedAt: now,
      },
    });

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
  const prisma = getPrisma();
  const { amount, code, rate, side, userId } = params;
  const fee = calculateFxTradeFee(side === "buy" ? amount : amount * rate);

  if (
    !code ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    throw new Error("Некорректные параметры валютной сделки.");
  }

  const normalizedCode = code.trim().toUpperCase();

  if (!isActiveFxCurrencyCode(normalizedCode)) {
    throw new Error("Эта валюта больше недоступна для торгов.");
  }

  const portfolio = await prisma.$transaction(async (tx) => {
    const currentPortfolio = await getOrCreatePortfolioRecord(tx, userId);
    const currentCashBalance = toNumber(currentPortfolio.cashBalance);
    const currentPosition = currentPortfolio.positions.find(
      (position) =>
        position.type === "CURRENCY" && position.currencyCode === normalizedCode
    );
    const currentQuantity = toNumber(currentPosition?.quantity);
    const currentAverageRate = toNumber(currentPosition?.averageRate);

    if (side === "buy") {
      const rubAmount = amount;
      const totalCost = rubAmount + fee;
      const fxQuantity = amount / rate;

      if (currentCashBalance + Number.EPSILON < totalCost) {
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
            decrement: toDecimal(totalCost),
          },
        },
      });

      await tx.portfolioTransaction.create({
        data: {
          portfolioId: currentPortfolio.id,
          type: "FX_BUY",
          currencyCode: normalizedCode,
          quantity: toDecimal(fxQuantity),
          price: toDecimal(rate),
          amount: toDecimal(rubAmount),
          feeAmount: toDecimal(fee),
        },
      });
    } else {
      const fxQuantity = amount;
      const rubAmount = amount * rate;
      const netRubAmount = rubAmount - fee;

      if (currentQuantity + Number.EPSILON < fxQuantity) {
        throw new Error("Недостаточно валюты для продажи.");
      }

      if (netRubAmount < 0) {
        throw new Error("Комиссия не может быть больше суммы валютной сделки.");
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
            increment: toDecimal(netRubAmount),
          },
        },
      });

      await tx.portfolioTransaction.create({
        data: {
          portfolioId: currentPortfolio.id,
          type: "FX_SELL",
          currencyCode: normalizedCode,
          quantity: toDecimal(fxQuantity),
          price: toDecimal(rate),
          amount: toDecimal(rubAmount),
          feeAmount: toDecimal(fee),
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
}) {
  const prisma = getPrisma();
  const { price, quantity, side, ticker, userId } = params;
  const fee = calculateStockTradeFee(quantity * price);

  if (
    !ticker ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isInteger(quantity) ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    throw new Error("Некорректные параметры сделки по акции.");
  }

  const normalizedTicker = ticker.trim().toUpperCase();
  const marketStatus = getStockMarketStatus();

  if (!marketStatus.isOpen) {
    throw new Error(
      marketStatus.reason ?? "Торговая сессия по акциям закрыта."
    );
  }

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

      await tx.portfolioTransaction.create({
        data: {
          portfolioId: currentPortfolio.id,
          type: "BUY",
          ticker: normalizedTicker,
          quantity: toDecimal(quantity),
          price: toDecimal(price),
          amount: toDecimal(quantity * price),
          feeAmount: toDecimal(fee),
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

      await tx.portfolioTransaction.create({
        data: {
          portfolioId: currentPortfolio.id,
          type: "SELL",
          ticker: normalizedTicker,
          quantity: toDecimal(quantity),
          price: toDecimal(price),
          amount: toDecimal(quantity * price),
          feeAmount: toDecimal(fee),
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
