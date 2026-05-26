import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { getPrisma } from "@/src/lib/db";
import type {
  FinanceAsset,
  FinanceState,
  FinancialAccountItem,
  FinancialMarketPairItem,
  FinancialOrderItem,
  FinancialOrderSide,
  FinancialTradeItem,
} from "@/src/features/finance/model/types";
import { assertPriceWithinReferenceBand } from "@/src/features/finance/model/reference-prices";

const DECIMAL_SCALE = 8;
const ORDER_HISTORY_LIMIT = 30;
const SERIALIZABLE_TRANSACTION_RETRIES = 3;

const DEFAULT_MARKET_PAIR_SYMBOL = "XCP/USDT";
const USD_RUB_PAIR_SYMBOL = "USD/RUB";
const DEFAULT_USD_RUB_RATE = 71.668;

const FINANCE_ASSETS: FinanceAsset[] = [
  "RUB",
  "USD",
  "USDT",
  "XCP",
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "DOGE",
  "TON",
];

const INITIAL_ACCOUNT_BALANCES: Record<FinanceAsset, number> = {
  BNB: 1.5,
  BTC: 0.05,
  DOGE: 5_000,
  ETH: 1,
  RUB: 300_000,
  SOL: 15,
  TON: 500,
  USD: 3_000,
  USDT: 10_000,
  XCP: 300,
};

const MARKET_PAIR_SEEDS = [
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
] satisfies Array<{
  amountPrecision: number;
  baseAsset: FinanceAsset;
  label: string;
  pricePrecision: number;
  quoteAsset: FinanceAsset;
  sortOrder: number;
  symbol: string;
}>;

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(DECIMAL_SCALE));
}

function roundDecimal(value: number) {
  return Number(value.toFixed(DECIMAL_SCALE));
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

  throw new Error("Не удалось выполнить финансовую операцию.");
}

function getStableHash(value: string) {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 10_000;
  }

  return hash;
}

function getAccountDisplayNumber(account: { asset: FinanceAsset; id: string }) {
  const suffix = String(
    getStableHash(`${account.id}:${account.asset}:card-number`)
  ).padStart(4, "0");
  const prefix =
    account.asset === "USD"
      ? "8401"
      : account.asset === "USDT"
        ? "8251"
        : account.asset === "XCP"
          ? "9907"
          : ["BTC", "ETH", "BNB", "SOL", "DOGE", "TON"].includes(account.asset)
            ? "7001"
            : "2204";

  return `${prefix} **** **** ${suffix}`;
}

function getCardValidThru(account: {
  asset: FinanceAsset;
  createdAt: Date;
  id: string;
}) {
  const hash = getStableHash(`${account.id}:${account.asset}:valid-thru`);
  const month = String((hash % 12) + 1).padStart(2, "0");
  const year = String(account.createdAt.getFullYear() + 4 + (hash % 3)).slice(
    -2
  );

  return `${month}/${year}`;
}

function getCardIssuer(asset: FinanceAsset) {
  switch (asset) {
    case "RUB":
      return "Xchange Premium";
    case "USD":
      return "Xchange Global";
    case "USDT":
      return "Xchange Stable";
    case "XCP":
      return "Xchange Token";
    case "BTC":
    case "ETH":
    case "BNB":
    case "SOL":
    case "DOGE":
    case "TON":
      return "Xchange Crypto";
  }
}

function mapMarketPair(pair: {
  amountPrecision: number;
  baseAsset: FinanceAsset;
  id: string;
  label: string;
  pricePrecision: number;
  quoteAsset: FinanceAsset;
  symbol: string;
}): FinancialMarketPairItem {
  return {
    amountPrecision: pair.amountPrecision,
    baseAsset: pair.baseAsset,
    id: pair.id,
    label: pair.label,
    pricePrecision: pair.pricePrecision,
    quoteAsset: pair.quoteAsset,
    symbol: pair.symbol,
  };
}

function mapAccount(
  account: {
    asset: FinanceAsset;
    balance: Prisma.Decimal;
    createdAt: Date;
    id: string;
    lockedBalance: Prisma.Decimal;
  },
  holderName: string
): FinancialAccountItem {
  const displayNumber = getAccountDisplayNumber(account);

  return {
    asset: account.asset,
    balance: toNumber(account.balance),
    card: {
      cvvLabel: "***",
      holderName: holderName.toUpperCase(),
      issuer: getCardIssuer(account.asset),
      maskedNumber: displayNumber,
      validThru: getCardValidThru(account),
    },
    displayNumber,
    id: account.id,
    lockedBalance: toNumber(account.lockedBalance),
  };
}

function mapOrder(
  order: {
    acceptedAt: Date | null;
    acceptedBy: { login: string } | null;
    acceptedByUserId: string | null;
    amount: Prisma.Decimal;
    asset: FinanceAsset;
    createdAt: Date;
    creator: { login: string };
    creatorUserId: string;
    filledAmount: Prisma.Decimal;
    id: string;
    pairId: string | null;
    price: Prisma.Decimal;
    quoteAsset: FinanceAsset;
    side: FinancialOrderSide;
    status: "OPEN" | "PARTIALLY_FILLED" | "ACCEPTED" | "CANCELLED";
  },
  userId: string
): FinancialOrderItem {
  const isOwn = order.creatorUserId === userId;

  return {
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    acceptedByLogin: order.acceptedBy?.login ?? null,
    amount: toNumber(order.amount),
    asset: order.asset,
    createdAt: order.createdAt.toISOString(),
    creatorLogin: order.creator.login,
    filledAmount: toNumber(order.filledAmount),
    id: order.id,
    pairId: order.pairId,
    price: toNumber(order.price),
    quoteAsset: order.quoteAsset,
    relation: isOwn
      ? "own"
      : order.acceptedByUserId === userId
        ? "accepted"
        : "available",
    side: order.side,
    status: order.status,
  };
}

function mapTrade(
  trade: {
    amount: Prisma.Decimal;
    asset: FinanceAsset;
    buyerUserId: string;
    executedAt: Date;
    id: string;
    pairId: string | null;
    price: Prisma.Decimal;
    quoteAmount: Prisma.Decimal;
    quoteAsset: FinanceAsset;
    sellerUserId: string;
  },
  userId: string
): FinancialTradeItem {
  return {
    amount: toNumber(trade.amount),
    asset: trade.asset,
    executedAt: trade.executedAt.toISOString(),
    id: trade.id,
    pairId: trade.pairId,
    price: toNumber(trade.price),
    quoteAmount: toNumber(trade.quoteAmount),
    quoteAsset: trade.quoteAsset,
    side: trade.buyerUserId === userId ? "buy" : "sell",
  };
}

async function ensureFinancialAccounts(
  db: Prisma.TransactionClient,
  userId: string
) {
  const accounts = await db.financialAccount.findMany({
    where: { userId },
    select: { asset: true },
  });
  const existingAssets = new Set(accounts.map((account) => account.asset));
  const missingAssets = FINANCE_ASSETS.filter(
    (asset) => !existingAssets.has(asset)
  );

  if (!missingAssets.length) {
    return;
  }

  await Promise.all(
    missingAssets.map((asset) =>
      db.financialAccount.upsert({
        where: {
          userId_asset: {
            asset,
            userId,
          },
        },
        update: {},
        create: {
          asset,
          balance: toDecimal(INITIAL_ACCOUNT_BALANCES[asset]),
          userId,
        },
      })
    )
  );
}

async function ensureFinancialMarketPairs(db: Prisma.TransactionClient) {
  const seedSymbols = MARKET_PAIR_SEEDS.map((pair) => pair.symbol);

  await db.financialMarketPair.updateMany({
    where: {
      symbol: {
        notIn: seedSymbols,
      },
    },
    data: {
      enabled: false,
    },
  });

  await Promise.all(
    MARKET_PAIR_SEEDS.map((pair) =>
      db.financialMarketPair.upsert({
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

async function getMarketPair(
  db: Prisma.TransactionClient,
  symbol = DEFAULT_MARKET_PAIR_SYMBOL
) {
  await ensureFinancialMarketPairs(db);

  const pair = await db.financialMarketPair.findUnique({
    where: { symbol },
  });

  if (!pair || !pair.enabled) {
    throw new Error("Торговая пара недоступна.");
  }

  return pair;
}

async function getFinancialAccount(
  db: Prisma.TransactionClient,
  params: {
    asset: FinanceAsset;
    userId: string;
  }
) {
  await ensureFinancialAccounts(db, params.userId);

  return db.financialAccount.findUniqueOrThrow({
    where: {
      userId_asset: params,
    },
  });
}

function assertAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Введите корректную сумму.");
  }
}

function assertLimitPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Введите корректную цену.");
  }
}

function isOpenOrderStatus(status: string) {
  return status === "OPEN" || status === "PARTIALLY_FILLED";
}

function getRemainingAmount(order: {
  amount: Prisma.Decimal;
  filledAmount: Prisma.Decimal;
}) {
  return Math.max(
    0,
    roundDecimal(toNumber(order.amount) - toNumber(order.filledAmount))
  );
}

function getNextStatus(amount: number, filledAmount: number) {
  if (filledAmount + Number.EPSILON >= amount) {
    return "ACCEPTED" as const;
  }

  return filledAmount > 0 ? ("PARTIALLY_FILLED" as const) : ("OPEN" as const);
}

export async function getFinanceState(
  userId: string,
  selectedPairSymbol = DEFAULT_MARKET_PAIR_SYMBOL
): Promise<FinanceState> {
  const prisma = getPrisma();

  await runSerializableTransaction(prisma, (tx) =>
    Promise.all([
      ensureFinancialAccounts(tx, userId),
      ensureFinancialMarketPairs(tx),
    ])
  );

  const marketPairs = await prisma.financialMarketPair.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { symbol: "asc" }],
  });
  const selectedPair =
    marketPairs.find((pair) => pair.symbol === selectedPairSymbol) ??
    marketPairs.find((pair) => pair.symbol === DEFAULT_MARKET_PAIR_SYMBOL) ??
    marketPairs[0];

  if (!selectedPair) {
    throw new Error("Не настроены торговые пары.");
  }

  const [user, accounts, openOrders, historyOrders, trades] = await Promise.all(
    [
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { login: true },
      }),
      prisma.financialAccount.findMany({
        where: { userId },
        orderBy: { asset: "asc" },
      }),
      prisma.financialOrder.findMany({
        where: {
          pairId: selectedPair.id,
          status: { in: ["OPEN", "PARTIALLY_FILLED"] },
        },
        include: {
          acceptedBy: {
            select: {
              login: true,
            },
          },
          creator: {
            select: {
              login: true,
            },
          },
        },
        orderBy: [{ side: "asc" }, { price: "desc" }, { createdAt: "asc" }],
      }),
      prisma.financialOrder.findMany({
        where: {
          creatorUserId: userId,
          pairId: selectedPair.id,
          status: { in: ["ACCEPTED", "CANCELLED"] },
        },
        include: {
          acceptedBy: {
            select: {
              login: true,
            },
          },
          creator: {
            select: {
              login: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: ORDER_HISTORY_LIMIT,
      }),
      prisma.financialTrade.findMany({
        where: {
          pairId: selectedPair.id,
        },
        orderBy: { executedAt: "desc" },
        take: ORDER_HISTORY_LIMIT,
      }),
    ]
  );

  return {
    accounts: accounts.map((account) => mapAccount(account, user.login)),
    currentUserLogin: user.login,
    marketPairs: marketPairs.map(mapMarketPair),
    orders: [...openOrders, ...historyOrders].map((order) =>
      mapOrder(order, userId)
    ),
    selectedPairSymbol: selectedPair.symbol,
    trades: trades.map((trade) => mapTrade(trade, userId)),
  };
}

export async function createFinancialOrder(params: {
  amount: number;
  creatorUserId: string;
  pairSymbol?: string;
  price: number;
  side: FinancialOrderSide;
}) {
  const prisma = getPrisma();
  const amount = Number(params.amount);
  const price = Number(params.price);

  assertAmount(amount);
  assertLimitPrice(price);

  await runSerializableTransaction(prisma, async (tx) => {
    const pair = await getMarketPair(tx, params.pairSymbol);
    const creator = await tx.user.findUnique({
      where: { id: params.creatorUserId },
      select: { id: true },
    });

    if (!creator) {
      throw new Error("Пользователь не найден.");
    }

    await assertPriceWithinReferenceBand(pair.symbol, price);

    await ensureFinancialAccounts(tx, params.creatorUserId);
    const lockAsset = params.side === "BUY" ? pair.quoteAsset : pair.baseAsset;
    const lockAmount =
      params.side === "BUY" ? roundDecimal(amount * price) : amount;
    const lockAccount = await getFinancialAccount(tx, {
      asset: lockAsset,
      userId: params.creatorUserId,
    });

    if (toNumber(lockAccount.balance) + Number.EPSILON < lockAmount) {
      throw new Error("Недостаточно свободных средств для заявки.");
    }

    await tx.financialAccount.update({
      where: { id: lockAccount.id },
      data: {
        balance: {
          decrement: toDecimal(lockAmount),
        },
        lockedBalance: {
          increment: toDecimal(lockAmount),
        },
      },
    });

    const order = await tx.financialOrder.create({
      data: {
        amount: toDecimal(amount),
        asset: pair.baseAsset,
        creatorUserId: params.creatorUserId,
        pairId: pair.id,
        price: toDecimal(price),
        quoteAsset: pair.quoteAsset,
        side: params.side,
      },
    });

    await matchFinancialOrder(tx, order.id);
  });
}

async function matchFinancialOrder(
  tx: Prisma.TransactionClient,
  orderId: string
) {
  while (true) {
    const taker = await tx.financialOrder.findUniqueOrThrow({
      where: { id: orderId },
    });

    if (!isOpenOrderStatus(taker.status)) {
      return;
    }

    const takerRemaining = getRemainingAmount(taker);

    if (takerRemaining <= 0) {
      return;
    }

    const maker = await tx.financialOrder.findFirst({
      where: {
        asset: taker.asset,
        creatorUserId: { not: taker.creatorUserId },
        pairId: taker.pairId,
        quoteAsset: taker.quoteAsset,
        side: taker.side === "BUY" ? "SELL" : "BUY",
        status: { in: ["OPEN", "PARTIALLY_FILLED"] },
        ...(taker.side === "BUY"
          ? { price: { lte: taker.price } }
          : { price: { gte: taker.price } }),
      },
      orderBy:
        taker.side === "BUY"
          ? [{ price: "asc" }, { createdAt: "asc" }]
          : [{ price: "desc" }, { createdAt: "asc" }],
    });

    if (!maker) {
      return;
    }

    const makerRemaining = getRemainingAmount(maker);
    const tradeAmount = roundDecimal(Math.min(takerRemaining, makerRemaining));
    const tradePrice = toNumber(maker.price);
    const quoteAmount = roundDecimal(tradeAmount * tradePrice);
    const buyOrder = taker.side === "BUY" ? taker : maker;
    const sellOrder = taker.side === "SELL" ? taker : maker;
    const buyerUserId = buyOrder.creatorUserId;
    const sellerUserId = sellOrder.creatorUserId;
    const buyerReservedQuote = roundDecimal(
      tradeAmount * toNumber(buyOrder.price)
    );
    const buyerQuoteRefund = roundDecimal(buyerReservedQuote - quoteAmount);

    await Promise.all([
      tx.financialAccount.update({
        where: {
          userId_asset: {
            asset: taker.quoteAsset,
            userId: buyerUserId,
          },
        },
        data: {
          balance:
            buyerQuoteRefund > 0
              ? { increment: toDecimal(buyerQuoteRefund) }
              : undefined,
          lockedBalance: {
            decrement: toDecimal(buyerReservedQuote),
          },
        },
      }),
      tx.financialAccount.update({
        where: {
          userId_asset: {
            asset: taker.asset,
            userId: buyerUserId,
          },
        },
        data: {
          balance: {
            increment: toDecimal(tradeAmount),
          },
        },
      }),
      tx.financialAccount.update({
        where: {
          userId_asset: {
            asset: taker.asset,
            userId: sellerUserId,
          },
        },
        data: {
          lockedBalance: {
            decrement: toDecimal(tradeAmount),
          },
        },
      }),
      tx.financialAccount.update({
        where: {
          userId_asset: {
            asset: taker.quoteAsset,
            userId: sellerUserId,
          },
        },
        data: {
          balance: {
            increment: toDecimal(quoteAmount),
          },
        },
      }),
      tx.financialTrade.create({
        data: {
          amount: toDecimal(tradeAmount),
          asset: taker.asset,
          buyOrderId: buyOrder.id,
          buyerUserId,
          pairId: taker.pairId,
          price: toDecimal(tradePrice),
          quoteAmount: toDecimal(quoteAmount),
          quoteAsset: taker.quoteAsset,
          sellOrderId: sellOrder.id,
          sellerUserId,
        },
      }),
    ]);

    const nextTakerFilled = roundDecimal(
      toNumber(taker.filledAmount) + tradeAmount
    );
    const nextMakerFilled = roundDecimal(
      toNumber(maker.filledAmount) + tradeAmount
    );
    const now = new Date();

    await Promise.all([
      tx.financialOrder.update({
        where: { id: taker.id },
        data: {
          acceptedAt:
            nextTakerFilled + Number.EPSILON >= toNumber(taker.amount)
              ? now
              : undefined,
          acceptedByUserId: maker.creatorUserId,
          filledAmount: toDecimal(nextTakerFilled),
          status: getNextStatus(toNumber(taker.amount), nextTakerFilled),
        },
      }),
      tx.financialOrder.update({
        where: { id: maker.id },
        data: {
          acceptedAt:
            nextMakerFilled + Number.EPSILON >= toNumber(maker.amount)
              ? now
              : undefined,
          acceptedByUserId: taker.creatorUserId,
          filledAmount: toDecimal(nextMakerFilled),
          status: getNextStatus(toNumber(maker.amount), nextMakerFilled),
        },
      }),
    ]);
  }
}

export async function cancelFinancialOrder(params: {
  orderId: string;
  userId: string;
}) {
  const prisma = getPrisma();

  await runSerializableTransaction(prisma, async (tx) => {
    const order = await tx.financialOrder.findFirst({
      where: {
        creatorUserId: params.userId,
        id: params.orderId,
        status: { in: ["OPEN", "PARTIALLY_FILLED"] },
      },
    });

    if (!order) {
      throw new Error("Отменить можно только свой открытый ордер.");
    }

    const remainingAmount = getRemainingAmount(order);
    const releaseAsset = order.side === "BUY" ? order.quoteAsset : order.asset;
    const releaseAmount =
      order.side === "BUY"
        ? roundDecimal(remainingAmount * toNumber(order.price))
        : remainingAmount;

    await Promise.all([
      tx.financialAccount.update({
        where: {
          userId_asset: {
            asset: releaseAsset,
            userId: params.userId,
          },
        },
        data: {
          balance: {
            increment: toDecimal(releaseAmount),
          },
          lockedBalance: {
            decrement: toDecimal(releaseAmount),
          },
        },
      }),
      tx.financialOrder.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
        },
      }),
    ]);
  });
}

export async function creditFinancialAccount(params: {
  amount: number;
  asset: FinanceAsset;
  userId: string;
}) {
  const prisma = getPrisma();

  assertAmount(params.amount);

  await runSerializableTransaction(prisma, async (tx) => {
    const account = await getFinancialAccount(tx, params);

    await tx.financialAccount.update({
      where: { id: account.id },
      data: {
        balance: {
          increment: toDecimal(params.amount),
        },
      },
    });
  });
}

export async function debitFinancialAccount(params: {
  amount: number;
  asset: FinanceAsset;
  userId: string;
}) {
  const prisma = getPrisma();

  assertAmount(params.amount);

  await runSerializableTransaction(prisma, async (tx) => {
    const account = await getFinancialAccount(tx, params);

    if (toNumber(account.balance) + Number.EPSILON < params.amount) {
      throw new Error("Недостаточно средств.");
    }

    await tx.financialAccount.update({
      where: { id: account.id },
      data: {
        balance: {
          decrement: toDecimal(params.amount),
        },
      },
    });
  });
}

export async function getUsdRubReferenceRate(): Promise<number> {
  const prisma = getPrisma();

  await ensureFinancialMarketPairs(prisma);

  const pair = await prisma.financialMarketPair.findUnique({
    where: { symbol: USD_RUB_PAIR_SYMBOL },
  });

  if (!pair?.enabled) {
    return DEFAULT_USD_RUB_RATE;
  }

  const [lastTrade, openOrders] = await Promise.all([
    prisma.financialTrade.findFirst({
      where: { pairId: pair.id },
      orderBy: { executedAt: "desc" },
    }),
    prisma.financialOrder.findMany({
      where: {
        pairId: pair.id,
        status: { in: ["OPEN", "PARTIALLY_FILLED"] },
      },
    }),
  ]);

  if (lastTrade) {
    return toNumber(lastTrade.price);
  }

  const bids = openOrders
    .filter((order) => order.side === "BUY")
    .map((order) => toNumber(order.price));
  const asks = openOrders
    .filter((order) => order.side === "SELL")
    .map((order) => toNumber(order.price));
  const bid = bids.length ? Math.max(...bids) : null;
  const ask = asks.length ? Math.min(...asks) : null;

  if (bid != null && ask != null) {
    return (bid + ask) / 2;
  }

  if (bid != null) {
    return bid;
  }

  if (ask != null) {
    return ask;
  }

  return DEFAULT_USD_RUB_RATE;
}
