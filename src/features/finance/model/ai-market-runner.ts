import type { Prisma } from "@prisma/client";

import {
  DEFAULT_TREASURY_POLICY,
  SYNTHETIC_TRADER_PROFILES,
  TREASURY_LOGIN,
  XCP_TREASURY_PAIRS,
  type MarketMode,
  type SyntheticTraderProfile,
} from "@/src/features/finance/model/ai-market-agent-rules";
import {
  cancelFinancialOrder,
  createFinancialOrder,
} from "@/src/features/finance/model/finance-server";
import { getCurrentMarketMode } from "@/src/features/finance/model/market-orchestrator";
import type { FinanceAsset } from "@/src/features/finance/model/types";
import { getPrisma } from "@/src/lib/db";

type RunnerMarketPair = {
  baseAsset: FinanceAsset;
  quoteAsset: FinanceAsset;
  symbol: string;
};

type RunnerAccount = {
  asset: FinanceAsset;
  balance: Prisma.Decimal;
};

type RunnerUser = {
  financialAccounts: RunnerAccount[];
  id: string;
  login: string;
};

type OpenOrderCounts = Map<string, number>;

export type AiMarketTickResult = {
  cancelledOrdersCount: number;
  errors: string[];
  llmError: string | null;
  llmStatus: string;
  mode: MarketMode;
  modeSource: string;
  placedOrdersCount: number;
};

const AGENT_ORDER_TTL_MINUTES = 15;
const MAX_ACTIVE_SYNTHETIC_TRADERS_PER_TICK = 4;
const MIN_QUOTE_ORDER_AMOUNT = 1;

export async function runAiMarketTick(): Promise<AiMarketTickResult> {
  const prisma = getPrisma();
  const marketMode = await getCurrentMarketMode();
  const errors: string[] = [];
  let placedOrdersCount = 0;

  const cancelledOrdersCount = await cancelStaleAgentOrders(errors);

  const [pairs, treasury, syntheticUsers, openAgentOrders] = await Promise.all([
    prisma.financialMarketPair.findMany({
      where: { enabled: true },
      select: {
        baseAsset: true,
        quoteAsset: true,
        symbol: true,
      },
    }),
    prisma.user.findUnique({
      where: { login: TREASURY_LOGIN },
      include: { financialAccounts: true },
    }),
    prisma.user.findMany({
      where: {
        login: {
          in: SYNTHETIC_TRADER_PROFILES.map((profile) => profile.login),
        },
      },
      include: { financialAccounts: true },
    }),
    prisma.financialOrder.findMany({
      where: {
        creator: {
          kind: {
            in: ["AI_AGENT", "TREASURY"],
          },
        },
        status: {
          in: ["OPEN", "PARTIALLY_FILLED"],
        },
      },
      select: {
        creatorUserId: true,
        pair: {
          select: {
            symbol: true,
          },
        },
      },
    }),
  ]);
  const openOrderCounts = getOpenOrderCounts(openAgentOrders);

  const pairBySymbol = new Map(
    pairs.map((pair) => [
      pair.symbol,
      {
        baseAsset: pair.baseAsset,
        quoteAsset: pair.quoteAsset,
        symbol: pair.symbol,
      } satisfies RunnerMarketPair,
    ])
  );

  if (treasury) {
    placedOrdersCount += await runTreasuryPolicy({
      errors,
      mode: marketMode.mode,
      openOrderCounts,
      pairBySymbol,
      treasury,
    });
  }

  const userByLogin = new Map(syntheticUsers.map((user) => [user.login, user]));
  const activeProfiles = selectActiveSyntheticTraderProfiles(marketMode.mode);

  for (const profile of activeProfiles) {
    const user = userByLogin.get(profile.login);

    if (!user) {
      errors.push(`AI user ${profile.login} is missing.`);
      continue;
    }

    placedOrdersCount += await runSyntheticTraderPolicy({
      errors,
      mode: marketMode.mode,
      openOrderCounts,
      pairBySymbol,
      profile,
      user,
    });
  }

  return {
    cancelledOrdersCount,
    errors,
    llmError: marketMode.llmError,
    llmStatus: marketMode.llmStatus,
    mode: marketMode.mode,
    modeSource: marketMode.modeSource,
    placedOrdersCount,
  };
}

async function cancelStaleAgentOrders(errors: string[]) {
  const prisma = getPrisma();
  const staleBefore = new Date(
    Date.now() - AGENT_ORDER_TTL_MINUTES * 60 * 1000
  );
  const staleOrders = await prisma.financialOrder.findMany({
    where: {
      createdAt: {
        lt: staleBefore,
      },
      creator: {
        kind: {
          in: ["AI_AGENT", "TREASURY"],
        },
      },
      status: {
        in: ["OPEN", "PARTIALLY_FILLED"],
      },
    },
    select: {
      creatorUserId: true,
      id: true,
    },
  });

  let cancelledOrdersCount = 0;

  for (const order of staleOrders) {
    try {
      await cancelFinancialOrder({
        orderId: order.id,
        userId: order.creatorUserId,
      });
      cancelledOrdersCount += 1;
    } catch (error) {
      errors.push(getErrorMessage(error));
    }
  }

  return cancelledOrdersCount;
}

async function runTreasuryPolicy(params: {
  errors: string[];
  mode: MarketMode;
  openOrderCounts: OpenOrderCounts;
  pairBySymbol: Map<string, RunnerMarketPair>;
  treasury: RunnerUser;
}) {
  const { errors, mode, openOrderCounts, pairBySymbol, treasury } = params;

  if (mode.treasuryBias === "pause") {
    return 0;
  }

  const sizeMultiplier = mode.treasuryBias === "conserve" ? 0.35 : 1;
  let placedOrdersCount = 0;

  if (mode.treasuryBias === "support" || mode.treasuryBias === "neutral") {
    placedOrdersCount += await maybePlaceOrder({
      errors,
      pair: pairBySymbol.get("XCP/USD"),
      priceMultiplier: 0.985,
      quoteBudget: DEFAULT_TREASURY_POLICY.maxUsdSpendPerTick * sizeMultiplier,
      side: "BUY",
      openOrderCounts,
      maxOpenOrders: DEFAULT_TREASURY_POLICY.maxOpenOrdersPerPair,
      user: treasury,
    });
    placedOrdersCount += await maybePlaceOrder({
      errors,
      pair: pairBySymbol.get("XCP/RUB"),
      priceMultiplier: 0.985,
      quoteBudget: DEFAULT_TREASURY_POLICY.maxRubSpendPerTick * sizeMultiplier,
      side: "BUY",
      openOrderCounts,
      maxOpenOrders: DEFAULT_TREASURY_POLICY.maxOpenOrdersPerPair,
      user: treasury,
    });
  }

  if (mode.treasuryBias === "cooldown" || mode.treasuryBias === "neutral") {
    for (const symbol of XCP_TREASURY_PAIRS) {
      placedOrdersCount += await maybePlaceOrder({
        baseAmount: DEFAULT_TREASURY_POLICY.maxXcpSellPerTick * sizeMultiplier,
        errors,
        pair: pairBySymbol.get(symbol),
        priceMultiplier: 1.018,
        side: "SELL",
        openOrderCounts,
        maxOpenOrders: DEFAULT_TREASURY_POLICY.maxOpenOrdersPerPair,
        user: treasury,
      });
    }
  }

  return placedOrdersCount;
}

async function runSyntheticTraderPolicy(params: {
  errors: string[];
  mode: MarketMode;
  openOrderCounts: OpenOrderCounts;
  pairBySymbol: Map<string, RunnerMarketPair>;
  profile: SyntheticTraderProfile;
  user: RunnerUser;
}) {
  const { errors, mode, openOrderCounts, pairBySymbol, profile, user } = params;
  const pair = choosePair(profile, mode, pairBySymbol);

  if (!pair) {
    return 0;
  }

  if (profile.liquidityRole >= 0.7) {
    const buyPlaced = await maybePlaceOrder({
      errors,
      pair,
      priceMultiplier: getMakerPriceMultiplier(profile, "BUY"),
      quoteBudget: getQuoteBudget(user, pair, profile, mode),
      side: "BUY",
      openOrderCounts,
      maxOpenOrders: profile.maxOpenOrders,
      user,
    });
    const sellPlaced = await maybePlaceOrder({
      baseAmount: getSellAmount(user, pair, profile, mode),
      errors,
      pair,
      priceMultiplier: getMakerPriceMultiplier(profile, "SELL"),
      side: "SELL",
      openOrderCounts,
      maxOpenOrders: profile.maxOpenOrders,
      user,
    });

    return buyPlaced + sellPlaced;
  }

  const side = chooseSyntheticTraderSide(profile, mode);

  return maybePlaceOrder({
    baseAmount: side === "SELL" ? getSellAmount(user, pair, profile, mode) : 0,
    errors,
    pair,
    priceMultiplier: getTakerPriceMultiplier(profile, side),
    quoteBudget: side === "BUY" ? getQuoteBudget(user, pair, profile, mode) : 0,
    side,
    openOrderCounts,
    maxOpenOrders: profile.maxOpenOrders,
    user,
  });
}

async function maybePlaceOrder(params: {
  baseAmount?: number;
  errors: string[];
  maxOpenOrders: number;
  openOrderCounts: OpenOrderCounts;
  pair: RunnerMarketPair | undefined;
  priceMultiplier: number;
  quoteBudget?: number;
  side: "BUY" | "SELL";
  user: RunnerUser;
}) {
  const {
    baseAmount = 0,
    errors,
    maxOpenOrders,
    openOrderCounts,
    pair,
    priceMultiplier,
    quoteBudget = 0,
    side,
    user,
  } = params;

  if (!pair) {
    return 0;
  }

  const orderCountKey = getOpenOrderCountKey(user.id, pair.symbol);

  if ((openOrderCounts.get(orderCountKey) ?? 0) >= maxOpenOrders) {
    return 0;
  }

  const referencePrice = await getReferencePrice(pair.symbol);
  const price = roundPrice(referencePrice * priceMultiplier);
  const amount =
    side === "BUY"
      ? roundAmount(
          Math.min(quoteBudget, getBalance(user, pair.quoteAsset)) / price
        )
      : roundAmount(Math.min(baseAmount, getBalance(user, pair.baseAsset)));

  if (amount <= 0 || amount * price < MIN_QUOTE_ORDER_AMOUNT) {
    return 0;
  }

  try {
    await createFinancialOrder({
      amount,
      creatorUserId: user.id,
      pairSymbol: pair.symbol,
      price,
      side,
    });
    openOrderCounts.set(
      orderCountKey,
      (openOrderCounts.get(orderCountKey) ?? 0) + 1
    );

    return 1;
  } catch (error) {
    errors.push(getErrorMessage(error));
    return 0;
  }
}

function selectActiveSyntheticTraderProfiles(mode: MarketMode) {
  const activityMultiplier =
    mode.retailBias === "risk_off" ? 0.45 : mode.liquidityMultiplier;

  return SYNTHETIC_TRADER_PROFILES.filter((profile) => {
    if (!profile.enabled) {
      return false;
    }

    const probability = Math.min(
      0.95,
      profile.activityRate * activityMultiplier
    );

    return Math.random() <= probability;
  }).slice(0, MAX_ACTIVE_SYNTHETIC_TRADERS_PER_TICK);
}

function choosePair(
  profile: SyntheticTraderProfile,
  mode: MarketMode,
  pairBySymbol: Map<string, RunnerMarketPair>
) {
  const availablePairs = profile.preferredPairs
    .map((symbol) => pairBySymbol.get(symbol))
    .filter((pair): pair is RunnerMarketPair => Boolean(pair));

  if (!availablePairs.length) {
    return null;
  }

  const xcpPairs = availablePairs.filter((pair) =>
    pair.symbol.startsWith("XCP/")
  );
  const shouldPreferXcp =
    xcpPairs.length > 0 &&
    Math.random() <= Math.min(0.95, profile.xcpInterest * mode.xcpAttention);

  if (shouldPreferXcp) {
    return xcpPairs[Math.floor(Math.random() * xcpPairs.length)];
  }

  return availablePairs[Math.floor(Math.random() * availablePairs.length)];
}

function chooseSyntheticTraderSide(
  profile: SyntheticTraderProfile,
  mode: MarketMode
) {
  let buyProbability = 0.5;

  if (mode.retailBias === "accumulate") {
    buyProbability += 0.2;
  } else if (mode.retailBias === "buy_dips") {
    buyProbability += profile.dipSensitivity * 0.25;
  } else if (mode.retailBias === "distribute") {
    buyProbability -= 0.2;
  } else if (mode.retailBias === "risk_off") {
    buyProbability -= 0.3;
  }

  buyProbability += (mode.riskAppetite - 0.5) * profile.riskTolerance * 0.4;

  return Math.random() <= Math.min(0.85, Math.max(0.15, buyProbability))
    ? "BUY"
    : "SELL";
}

function getQuoteBudget(
  user: RunnerUser,
  pair: RunnerMarketPair,
  profile: SyntheticTraderProfile,
  mode: MarketMode
) {
  const quoteBalance = getBalance(user, pair.quoteAsset);
  const riskMultiplier = 0.5 + mode.riskAppetite;
  const orderShare = Math.min(
    profile.maxOrderShare,
    profile.orderSize * riskMultiplier
  );

  return quoteBalance * orderShare;
}

function getSellAmount(
  user: RunnerUser,
  pair: RunnerMarketPair,
  profile: SyntheticTraderProfile,
  mode: MarketMode
) {
  const baseBalance = getBalance(user, pair.baseAsset);
  const riskMultiplier = mode.retailBias === "risk_off" ? 1.2 : 0.75;
  const orderShare = Math.min(
    profile.maxOrderShare,
    profile.orderSize * riskMultiplier
  );

  return baseBalance * orderShare;
}

function getMakerPriceMultiplier(
  profile: SyntheticTraderProfile,
  side: "BUY" | "SELL"
) {
  const distanceBps = 60 + profile.patience * 120;
  const distance = distanceBps / 10_000;

  return side === "BUY" ? 1 - distance : 1 + distance;
}

function getTakerPriceMultiplier(
  profile: SyntheticTraderProfile,
  side: "BUY" | "SELL"
) {
  const distanceBps = 80 + profile.randomness * 160;
  const distance = distanceBps / 10_000;

  return side === "BUY" ? 1 - distance : 1 + distance;
}

async function getReferencePrice(symbol: string) {
  const { getReferencePriceQuote } =
    await import("@/src/features/finance/model/reference-prices");
  const quote = await getReferencePriceQuote(symbol);

  return quote?.price ?? 1;
}

function getBalance(user: RunnerUser, asset: FinanceAsset) {
  const account = user.financialAccounts.find((item) => item.asset === asset);

  return account ? Number(account.balance) : 0;
}

function getOpenOrderCounts(
  orders: Array<{
    creatorUserId: string;
    pair: { symbol: string } | null;
  }>
) {
  const counts: OpenOrderCounts = new Map();

  for (const order of orders) {
    if (!order.pair) {
      continue;
    }

    const key = getOpenOrderCountKey(order.creatorUserId, order.pair.symbol);

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function getOpenOrderCountKey(userId: string, pairSymbol: string) {
  return `${userId}:${pairSymbol}`;
}

function roundPrice(value: number) {
  return Number(value.toFixed(8));
}

function roundAmount(value: number) {
  return Number(value.toFixed(8));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
