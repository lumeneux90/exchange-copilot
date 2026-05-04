import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { getPrisma } from "@/src/lib/db";
import type {
  FinanceAsset,
  FinanceState,
  FinancialAccountItem,
  FinancialOrderItem,
} from "@/src/features/finance/model/types";

const DECIMAL_SCALE = 8;
const ORDER_HISTORY_LIMIT = 30;
const SERIALIZABLE_TRANSACTION_RETRIES = 3;

const FINANCE_ASSETS: FinanceAsset[] = ["RUB", "USD", "XCP"];

const INITIAL_ACCOUNT_BALANCES: Record<FinanceAsset, number> = {
  RUB: 100_000,
  USD: 1_000,
  XCP: 250,
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
      : account.asset === "XCP"
        ? "9907"
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
    case "XCP":
      return "Xchange Token";
  }
}

function mapAccount(
  account: {
    asset: FinanceAsset;
    balance: Prisma.Decimal;
    createdAt: Date;
    id: string;
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
    id: string;
    status: "OPEN" | "ACCEPTED" | "CANCELLED";
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
    id: order.id,
    relation: isOwn
      ? "own"
      : order.acceptedByUserId === userId
        ? "accepted"
        : "available",
    status: order.status,
  };
}

async function ensureFinancialAccounts(
  db: Prisma.TransactionClient,
  userId: string
) {
  await Promise.all(
    FINANCE_ASSETS.map((asset) =>
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

export async function getFinanceState(userId: string): Promise<FinanceState> {
  const prisma = getPrisma();

  await runSerializableTransaction(prisma, (tx) =>
    ensureFinancialAccounts(tx, userId)
  );

  const [user, accounts, orders] = await Promise.all([
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
        OR: [
          { creatorUserId: userId },
          { acceptedByUserId: userId },
          {
            status: "OPEN",
            NOT: {
              creatorUserId: userId,
            },
          },
        ],
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
  ]);

  return {
    accounts: accounts.map((account) => mapAccount(account, user.login)),
    currentUserLogin: user.login,
    orders: orders.map((order) => mapOrder(order, userId)),
  };
}

export async function createFinancialOrder(params: {
  amount: number;
  asset: FinanceAsset;
  creatorUserId: string;
}) {
  const prisma = getPrisma();
  const amount = Number(params.amount);

  assertAmount(amount);

  await runSerializableTransaction(prisma, async (tx) => {
    const creator = await tx.user.findUnique({
      where: { id: params.creatorUserId },
      select: { id: true },
    });

    if (!creator) {
      throw new Error("Пользователь не найден.");
    }

    await ensureFinancialAccounts(tx, params.creatorUserId);

    await tx.financialOrder.create({
      data: {
        amount: toDecimal(amount),
        asset: params.asset,
        creatorUserId: params.creatorUserId,
      },
    });
  });
}

export async function acceptFinancialOrder(params: {
  orderId: string;
  userId: string;
}) {
  const prisma = getPrisma();

  await runSerializableTransaction(prisma, async (tx) => {
    const order = await tx.financialOrder.findUnique({
      where: { id: params.orderId },
    });

    if (!order || order.status !== "OPEN") {
      throw new Error("Ордер уже не активен.");
    }

    if (order.creatorUserId === params.userId) {
      throw new Error("Нельзя принять собственный ордер.");
    }

    const amount = toNumber(order.amount);
    const [debitAccount, creditAccount] = await Promise.all([
      getFinancialAccount(tx, {
        asset: order.asset,
        userId: params.userId,
      }),
      getFinancialAccount(tx, {
        asset: order.asset,
        userId: order.creatorUserId,
      }),
    ]);

    if (toNumber(debitAccount.balance) + Number.EPSILON < amount) {
      throw new Error("Недостаточно средств для исполнения ордера.");
    }

    await Promise.all([
      tx.financialAccount.update({
        where: { id: debitAccount.id },
        data: {
          balance: {
            decrement: order.amount,
          },
        },
      }),
      tx.financialAccount.update({
        where: { id: creditAccount.id },
        data: {
          balance: {
            increment: order.amount,
          },
        },
      }),
      tx.financialOrder.update({
        where: { id: order.id },
        data: {
          acceptedByUserId: params.userId,
          acceptedAt: new Date(),
          status: "ACCEPTED",
        },
      }),
    ]);
  });
}

export async function cancelFinancialOrder(params: {
  orderId: string;
  userId: string;
}) {
  const prisma = getPrisma();

  const result = await prisma.financialOrder.updateMany({
    where: {
      creatorUserId: params.userId,
      id: params.orderId,
      status: "OPEN",
    },
    data: {
      status: "CANCELLED",
    },
  });

  if (result.count === 0) {
    throw new Error("Отменить можно только свой открытый ордер.");
  }
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
