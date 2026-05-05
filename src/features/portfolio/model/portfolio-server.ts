import "server-only";

import {
  Prisma,
  type BrokerageCurrency,
  type PrismaClient,
} from "@prisma/client";

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
import { getPrisma } from "@/src/lib/db";
import type {
  PortfolioState,
  PortfolioTransferCurrency,
} from "@/src/features/portfolio/model/types";

const DECIMAL_SCALE = 8;
const POSITION_EPSILON = 0.000001;
const DEFAULT_HISTORY_PAGE_SIZE = 25;
const MAX_HISTORY_PAGE_SIZE = 100;
const SERIALIZABLE_TRANSACTION_RETRIES = 3;
const BROKERAGE_CURRENCIES: BrokerageCurrency[] = ["RUB", "USD", "EUR", "CNY"];
const TRANSFER_CURRENCIES: PortfolioTransferCurrency[] = ["RUB", "USD"];
const FINANCIAL_ACCOUNT_DEFAULTS = {
  RUB: 0,
  USD: 0,
  XCP: 0,
} as const;

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

function isSerializableTransactionConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function isUniqueConstraintConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isRetriableTransactionConflict(error: unknown) {
  return (
    isSerializableTransactionConflict(error) ||
    isUniqueConstraintConflict(error)
  );
}

async function runSerializableTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_RETRIES;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (
        attempt < SERIALIZABLE_TRANSACTION_RETRIES &&
        isRetriableTransactionConflict(error)
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Не удалось выполнить операцию с портфелем.");
}

function mapPortfolioTransaction(transaction: {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "BUY" | "SELL" | "FX_BUY" | "FX_SELL";
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
  cashBalances: Array<{
    averageRate: Prisma.Decimal | null;
    balance: Prisma.Decimal;
    currency: BrokerageCurrency;
  }>;
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

  const rubCashBalance = portfolio.cashBalances.find(
    (cashBalance) => cashBalance.currency === "RUB"
  );
  const currencies = portfolio.cashBalances
    .filter(
      (cashBalance) =>
        cashBalance.currency !== "RUB" && toNumber(cashBalance.balance) > 0
    )
    .map((cashBalance) => ({
      code: cashBalance.currency,
      quantity: toNumber(cashBalance.balance),
      averageRate: toNumber(cashBalance.averageRate),
    }))
    .sort((left, right) => left.code.localeCompare(right.code));

  return {
    cashBalance: toNumber(rubCashBalance?.balance ?? portfolio.cashBalance),
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
      cashBalances: true,
      positions: true,
    },
  });

  if (existingPortfolio) {
    return existingPortfolio;
  }

  try {
    return await db.portfolio.create({
      data: {
        userId,
      },
      include: {
        cashBalances: true,
        positions: true,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintConflict(error)) {
      throw error;
    }

    return db.portfolio.findUniqueOrThrow({
      where: { userId },
      include: {
        cashBalances: true,
        positions: true,
      },
    });
  }
}

async function upsertPortfolioRecord(
  db: Prisma.TransactionClient,
  userId: string
) {
  return db.portfolio.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: {
      cashBalances: true,
      positions: true,
    },
  });
}

function assertAmount(amount: number, message = "Введите корректную сумму.") {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(message);
  }
}

function assertBrokerageCurrency(
  currency: string
): asserts currency is BrokerageCurrency {
  if (!BROKERAGE_CURRENCIES.includes(currency as BrokerageCurrency)) {
    throw new Error("Эта валюта не поддерживается брокерским счетом.");
  }
}

function assertTransferCurrency(
  currency: string
): asserts currency is PortfolioTransferCurrency {
  if (!TRANSFER_CURRENCIES.includes(currency as PortfolioTransferCurrency)) {
    throw new Error("Эта валюта недоступна для перевода между счетами.");
  }
}

function getTransferRate(currency: PortfolioTransferCurrency, rate?: number) {
  if (currency === "RUB") {
    return 1;
  }

  if (!Number.isFinite(rate) || rate == null || rate <= 0) {
    throw new Error("Не удалось определить курс валюты для перевода.");
  }

  return rate;
}

async function getBrokerageCashBalance(
  db: Prisma.TransactionClient,
  params: {
    currency: BrokerageCurrency;
    portfolioId: string;
  }
) {
  const existingBalance = await db.brokerageCashBalance.findUnique({
    where: {
      portfolioId_currency: params,
    },
  });

  if (existingBalance) {
    return existingBalance;
  }

  return db.brokerageCashBalance.create({
    data: {
      averageRate: params.currency === "RUB" ? toDecimal(1) : null,
      balance: toDecimal(0),
      currency: params.currency,
      portfolioId: params.portfolioId,
    },
  });
}

async function getFinancialAccount(
  db: Prisma.TransactionClient,
  params: {
    asset: "RUB" | "USD" | "XCP";
    userId: string;
  }
) {
  return db.financialAccount.upsert({
    where: {
      userId_asset: params,
    },
    update: {},
    create: {
      asset: params.asset,
      balance: toDecimal(FINANCIAL_ACCOUNT_DEFAULTS[params.asset]),
      userId: params.userId,
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
          cashBalances: true,
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
    const cashBalances = portfolio?.cashBalances ?? [];
    const rubCashBalance = cashBalances.find(
      (cashBalance) => cashBalance.currency === "RUB"
    );
    const cashBalance = toNumber(
      rubCashBalance?.balance ?? portfolio?.cashBalance
    );
    let holdingsValue = 0;
    let holdingsCostBasis = 0;
    let currenciesValue = 0;
    let currenciesCostBasis = 0;
    let holdingsCount = 0;
    let currencyPositionsCount = 0;

    for (const cash of cashBalances) {
      if (cash.currency === "RUB") {
        continue;
      }

      const quantity = toNumber(cash.balance);
      const currentRate =
        ratesByCode.get(cash.currency)?.price ?? toNumber(cash.averageRate);
      const averageRate = toNumber(cash.averageRate);

      if (quantity <= 0) {
        continue;
      }

      currencyPositionsCount += 1;
      currenciesValue += currentRate * quantity;
      currenciesCostBasis += averageRate * quantity;
    }

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

export async function depositFunds(params: {
  userId: string;
  amount: number;
  currency?: PortfolioTransferCurrency;
  rate?: number;
}) {
  const prisma = getPrisma();
  const { amount, userId } = params;
  const currency = params.currency ?? "RUB";

  assertAmount(amount, "Некорректная сумма пополнения.");
  assertTransferCurrency(currency);
  assertBrokerageCurrency(currency);

  const transferRate = getTransferRate(currency, params.rate);

  const portfolio = await runSerializableTransaction(prisma, async (tx) => {
    const currentPortfolio = await upsertPortfolioRecord(tx, userId);
    const [financialAccount, brokerageBalance] = await Promise.all([
      getFinancialAccount(tx, {
        asset: currency,
        userId,
      }),
      getBrokerageCashBalance(tx, {
        currency,
        portfolioId: currentPortfolio.id,
      }),
    ]);

    if (toNumber(financialAccount.balance) + Number.EPSILON < amount) {
      throw new Error(`Недостаточно ${currency} на финансовом счете.`);
    }

    const currentBalance = toNumber(brokerageBalance.balance);
    const currentAverageRate = toNumber(brokerageBalance.averageRate);
    const currentCostBasis =
      currentAverageRate > 0
        ? currentAverageRate * currentBalance
        : transferRate * currentBalance;
    const nextBalance = currentBalance + amount;
    const nextAverageRate =
      currency === "RUB"
        ? 1
        : (currentCostBasis + transferRate * amount) / nextBalance;
    const operations: Array<Promise<unknown>> = [
      tx.financialAccount.update({
        where: { id: financialAccount.id },
        data: {
          balance: {
            decrement: toDecimal(amount),
          },
        },
      }),
      tx.brokerageCashBalance.update({
        where: { id: brokerageBalance.id },
        data: {
          averageRate: toDecimal(nextAverageRate),
          balance: {
            increment: toDecimal(amount),
          },
        },
      }),
      tx.portfolioTransaction.create({
        data: {
          portfolioId: currentPortfolio.id,
          type: "DEPOSIT",
          currencyCode: currency,
          price: currency === "RUB" ? null : toDecimal(transferRate),
          amount: toDecimal(amount),
        },
      }),
    ];

    if (currency === "RUB") {
      operations.push(
        tx.portfolio.update({
          where: { id: currentPortfolio.id },
          data: {
            cashBalance: {
              increment: toDecimal(amount),
            },
          },
        })
      );
    }

    await Promise.all(operations);

    return tx.portfolio.findUniqueOrThrow({
      where: { id: currentPortfolio.id },
      include: {
        cashBalances: true,
        positions: true,
      },
    });
  });

  return mapPortfolioState(portfolio);
}

export async function withdrawFunds(params: {
  userId: string;
  amount: number;
  currency?: PortfolioTransferCurrency;
}) {
  const prisma = getPrisma();
  const { amount, userId } = params;
  const currency = params.currency ?? "RUB";

  assertAmount(amount, "Некорректная сумма вывода.");
  assertTransferCurrency(currency);
  assertBrokerageCurrency(currency);

  const portfolio = await runSerializableTransaction(prisma, async (tx) => {
    const currentPortfolio = await upsertPortfolioRecord(tx, userId);
    const [financialAccount, brokerageBalance] = await Promise.all([
      getFinancialAccount(tx, {
        asset: currency,
        userId,
      }),
      getBrokerageCashBalance(tx, {
        currency,
        portfolioId: currentPortfolio.id,
      }),
    ]);

    if (toNumber(brokerageBalance.balance) + Number.EPSILON < amount) {
      throw new Error(`Недостаточно ${currency} на брокерском счете.`);
    }

    const nextBalance = toNumber(brokerageBalance.balance) - amount;
    const operations: Array<Promise<unknown>> = [
      tx.brokerageCashBalance.update({
        where: { id: brokerageBalance.id },
        data: {
          averageRate:
            currency === "RUB"
              ? toDecimal(1)
              : nextBalance <= POSITION_EPSILON
                ? null
                : brokerageBalance.averageRate,
          balance: {
            decrement: toDecimal(amount),
          },
        },
      }),
      tx.financialAccount.update({
        where: { id: financialAccount.id },
        data: {
          balance: {
            increment: toDecimal(amount),
          },
        },
      }),
      tx.portfolioTransaction.create({
        data: {
          portfolioId: currentPortfolio.id,
          type: "WITHDRAWAL",
          currencyCode: currency,
          amount: toDecimal(amount),
        },
      }),
    ];

    if (currency === "RUB") {
      operations.push(
        tx.portfolio.update({
          where: { id: currentPortfolio.id },
          data: {
            cashBalance: {
              decrement: toDecimal(amount),
            },
          },
        })
      );
    }

    await Promise.all(operations);

    return tx.portfolio.findUniqueOrThrow({
      where: { id: currentPortfolio.id },
      include: {
        cashBalances: true,
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
  assertBrokerageCurrency(normalizedCode);

  const portfolio = await runSerializableTransaction(prisma, async (tx) => {
    const currentPortfolio = await upsertPortfolioRecord(tx, userId);
    const [rubBalance, currencyBalance] = await Promise.all([
      getBrokerageCashBalance(tx, {
        currency: "RUB",
        portfolioId: currentPortfolio.id,
      }),
      getBrokerageCashBalance(tx, {
        currency: normalizedCode,
        portfolioId: currentPortfolio.id,
      }),
    ]);
    const currentQuantity = toNumber(currencyBalance.balance);
    const currentAverageRate = toNumber(currencyBalance.averageRate);

    if (side === "buy") {
      const rubAmount = amount;
      const totalCost = rubAmount + fee;
      const fxQuantity = amount / rate;

      if (toNumber(rubBalance.balance) + Number.EPSILON < totalCost) {
        throw new Error("Недостаточно рублей для покупки валюты.");
      }

      const nextQuantity = currentQuantity + fxQuantity;
      const nextAverageRate =
        nextQuantity > 0
          ? (currentAverageRate * currentQuantity + rubAmount) / nextQuantity
          : rate;

      await Promise.all([
        tx.brokerageCashBalance.update({
          where: { id: currencyBalance.id },
          data: {
            averageRate: toDecimal(nextAverageRate),
            balance: toDecimal(nextQuantity),
          },
        }),
        tx.brokerageCashBalance.update({
          where: { id: rubBalance.id },
          data: {
            balance: {
              decrement: toDecimal(totalCost),
            },
          },
        }),
        tx.portfolio.update({
          where: { id: currentPortfolio.id },
          data: {
            cashBalance: {
              decrement: toDecimal(totalCost),
            },
          },
        }),
      ]);

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

      await Promise.all([
        tx.brokerageCashBalance.update({
          where: { id: currencyBalance.id },
          data: {
            averageRate:
              nextQuantity <= POSITION_EPSILON
                ? null
                : currencyBalance.averageRate,
            balance: toDecimal(Math.max(0, nextQuantity)),
          },
        }),
        tx.brokerageCashBalance.update({
          where: { id: rubBalance.id },
          data: {
            balance: {
              increment: toDecimal(netRubAmount),
            },
          },
        }),
        tx.portfolio.update({
          where: { id: currentPortfolio.id },
          data: {
            cashBalance: {
              increment: toDecimal(netRubAmount),
            },
          },
        }),
      ]);

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
        cashBalances: true,
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

  const portfolio = await runSerializableTransaction(prisma, async (tx) => {
    const currentPortfolio = await upsertPortfolioRecord(tx, userId);
    const rubBalance = await getBrokerageCashBalance(tx, {
      currency: "RUB",
      portfolioId: currentPortfolio.id,
    });
    const currentPosition = currentPortfolio.positions.find(
      (position) =>
        position.type === "STOCK" && position.ticker === normalizedTicker
    );
    const currentQuantity = toNumber(currentPosition?.quantity);
    const currentAveragePrice = toNumber(currentPosition?.averagePrice);

    if (side === "buy") {
      const totalCost = quantity * price + fee;

      if (toNumber(rubBalance.balance) + Number.EPSILON < totalCost) {
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

      await Promise.all([
        tx.brokerageCashBalance.update({
          where: { id: rubBalance.id },
          data: {
            balance: {
              decrement: toDecimal(totalCost),
            },
          },
        }),
        tx.portfolio.update({
          where: { id: currentPortfolio.id },
          data: {
            cashBalance: {
              decrement: toDecimal(totalCost),
            },
          },
        }),
      ]);

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

      await Promise.all([
        tx.brokerageCashBalance.update({
          where: { id: rubBalance.id },
          data: {
            balance: {
              increment: toDecimal(proceeds),
            },
          },
        }),
        tx.portfolio.update({
          where: { id: currentPortfolio.id },
          data: {
            cashBalance: {
              increment: toDecimal(proceeds),
            },
          },
        }),
      ]);

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
        cashBalances: true,
        positions: true,
      },
    });
  });

  return mapPortfolioState(portfolio);
}
