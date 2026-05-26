import "server-only";

import { Prisma } from "@prisma/client";

import {
  DEFAULT_TREASURY_POLICY,
  FALLBACK_MARKET_MODE,
  TREASURY_LOGIN,
  normalizeMarketMode,
  type MarketMode,
} from "@/src/features/finance/model/ai-market-agent-rules";
import { getReferencePriceQuote } from "@/src/features/finance/model/reference-prices";
import { getPrisma } from "@/src/lib/db";

type UserKindShare = {
  aiAgent: number;
  human: number;
  treasury: number;
};

export type MarketPairSnapshot = {
  depthQuoteAmount: {
    ask: number;
    bid: number;
  };
  lastPrice: number | null;
  referencePrice: number | null;
  referenceSource: "CBR" | "BINANCE" | "INTERNAL" | null;
  spreadBps: number | null;
  symbol: string;
  tradeCount60m: number;
  volume60m: number;
};

export type TreasuryReserveSnapshot = {
  rub: number;
  usd: number;
  usdt: number;
  xcp: number;
};

export type MarketSnapshot = {
  capturedAt: string;
  mode: MarketMode;
  pairs: MarketPairSnapshot[];
  treasuryReserves: TreasuryReserveSnapshot;
  userKindTradeShare60m: UserKindShare;
  xcp: {
    attention: number;
    buyPressure: number;
    sellPressure: number;
  };
};

const TRADE_WINDOW_MS = 60 * 60 * 1000;

export async function buildMarketSnapshot(
  previousMode = FALLBACK_MARKET_MODE
): Promise<MarketSnapshot> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - TRADE_WINDOW_MS);

  const [pairs, openOrders, trades, users, treasury] = await Promise.all([
    prisma.financialMarketPair.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { symbol: "asc" }],
    }),
    prisma.financialOrder.findMany({
      where: {
        status: { in: ["OPEN", "PARTIALLY_FILLED"] },
      },
    }),
    prisma.financialTrade.findMany({
      where: {
        executedAt: {
          gte: since,
        },
      },
      orderBy: {
        executedAt: "desc",
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        kind: true,
      },
    }),
    prisma.user.findUnique({
      where: { login: TREASURY_LOGIN },
      include: {
        financialAccounts: true,
      },
    }),
  ]);

  const pairSnapshots = await Promise.all(
    pairs.map(async (pair) => {
      const pairOrders = openOrders.filter((order) => order.pairId === pair.id);
      const pairTrades = trades.filter((trade) => trade.pairId === pair.id);
      const reference = await getReferencePriceQuote(pair.symbol);
      const bids = pairOrders.filter((order) => order.side === "BUY");
      const asks = pairOrders.filter((order) => order.side === "SELL");
      const bestBid = getBestPrice(bids, "BUY");
      const bestAsk = getBestPrice(asks, "SELL");

      return {
        depthQuoteAmount: {
          ask: getDepthQuoteAmount(asks),
          bid: getDepthQuoteAmount(bids),
        },
        lastPrice: pairTrades[0] ? toNumber(pairTrades[0].price) : null,
        referencePrice: reference?.price ?? null,
        referenceSource: reference?.source ?? null,
        spreadBps: getSpreadBps(bestBid, bestAsk),
        symbol: pair.symbol,
        tradeCount60m: pairTrades.length,
        volume60m: pairTrades.reduce(
          (sum, trade) => sum + toNumber(trade.quoteAmount),
          0
        ),
      } satisfies MarketPairSnapshot;
    })
  );

  const xcpPairs = pairSnapshots.filter((pair) =>
    pair.symbol.startsWith("XCP/")
  );
  const xcpBuyPressure = xcpPairs.reduce(
    (sum, pair) => sum + pair.depthQuoteAmount.bid,
    0
  );
  const xcpSellPressure = xcpPairs.reduce(
    (sum, pair) => sum + pair.depthQuoteAmount.ask,
    0
  );
  const xcpVolume = xcpPairs.reduce((sum, pair) => sum + pair.volume60m, 0);
  const userKindById = new Map(users.map((user) => [user.id, user.kind]));

  return {
    capturedAt: new Date().toISOString(),
    mode: previousMode,
    pairs: pairSnapshots,
    treasuryReserves: getTreasuryReserves(treasury?.financialAccounts ?? []),
    userKindTradeShare60m: getUserKindTradeShare(trades, userKindById),
    xcp: {
      attention: clamp01(xcpVolume / 100_000),
      buyPressure: xcpBuyPressure,
      sellPressure: xcpSellPressure,
    },
  };
}

export function getRuleBasedMarketMode(snapshot: MarketSnapshot): MarketMode {
  const xcpPairs = snapshot.pairs.filter((pair) =>
    pair.symbol.startsWith("XCP/")
  );
  const averageXcpSpread = average(
    xcpPairs
      .map((pair) => pair.spreadBps)
      .filter((spread): spread is number => spread != null)
  );
  const hasThinXcpLiquidity = xcpPairs.some(
    (pair) =>
      pair.depthQuoteAmount.bid <= 0 ||
      pair.depthQuoteAmount.ask <= 0 ||
      (pair.spreadBps != null && pair.spreadBps > 700)
  );
  const xcpSellPressureRatio =
    snapshot.xcp.sellPressure /
    Math.max(1, snapshot.xcp.buyPressure + snapshot.xcp.sellPressure);
  const treasuryUsdHealthy =
    snapshot.treasuryReserves.usd > DEFAULT_TREASURY_POLICY.minUsdReserve;
  const treasuryRubHealthy =
    snapshot.treasuryReserves.rub > DEFAULT_TREASURY_POLICY.minRubReserve;
  const treasuryCanSupport = treasuryUsdHealthy || treasuryRubHealthy;

  if (hasThinXcpLiquidity && treasuryCanSupport) {
    return normalizeMarketMode({
      durationMinutes: 30,
      liquidityMultiplier: 1.35,
      mode: "xcp_treasury_support",
      retailBias: "buy_dips",
      riskAppetite: 0.45,
      treasuryBias: "support",
      volatilityMultiplier: 1.1,
      xcpAttention: Math.max(0.55, snapshot.xcp.attention),
    });
  }

  if (!treasuryCanSupport) {
    return normalizeMarketMode({
      durationMinutes: 45,
      liquidityMultiplier: 0.75,
      mode: "risk_off",
      retailBias: "risk_off",
      riskAppetite: 0.25,
      treasuryBias: "conserve",
      volatilityMultiplier: 1.25,
      xcpAttention: snapshot.xcp.attention,
    });
  }

  if (xcpSellPressureRatio > 0.65) {
    return normalizeMarketMode({
      durationMinutes: 30,
      liquidityMultiplier: 1.1,
      mode: "xcp_treasury_support",
      retailBias: "buy_dips",
      riskAppetite: 0.4,
      treasuryBias: "support",
      volatilityMultiplier: 1.2,
      xcpAttention: Math.max(0.5, snapshot.xcp.attention),
    });
  }

  if (averageXcpSpread != null && averageXcpSpread < 150) {
    return normalizeMarketMode({
      durationMinutes: 30,
      liquidityMultiplier: 0.9,
      mode: "xcp_hype",
      retailBias: "accumulate",
      riskAppetite: 0.65,
      treasuryBias: "cooldown",
      volatilityMultiplier: 1.35,
      xcpAttention: Math.max(0.65, snapshot.xcp.attention),
    });
  }

  return FALLBACK_MARKET_MODE;
}

export async function getCurrentMarketMode(
  previousMode = FALLBACK_MARKET_MODE
) {
  const snapshot = await buildMarketSnapshot(previousMode);

  return {
    mode: getRuleBasedMarketMode(snapshot),
    snapshot,
  };
}

function getBestPrice(
  orders: Array<{ price: Prisma.Decimal }>,
  side: "BUY" | "SELL"
) {
  if (!orders.length) {
    return null;
  }

  const prices = orders.map((order) => toNumber(order.price));

  return side === "BUY" ? Math.max(...prices) : Math.min(...prices);
}

function getSpreadBps(bestBid: number | null, bestAsk: number | null) {
  if (bestBid == null || bestAsk == null || bestBid <= 0 || bestAsk <= 0) {
    return null;
  }

  const mid = (bestBid + bestAsk) / 2;

  return ((bestAsk - bestBid) / mid) * 10_000;
}

function getDepthQuoteAmount(
  orders: Array<{
    amount: Prisma.Decimal;
    filledAmount: Prisma.Decimal;
    price: Prisma.Decimal;
  }>
) {
  return orders.reduce((sum, order) => {
    const remainingAmount = Math.max(
      0,
      toNumber(order.amount) - toNumber(order.filledAmount)
    );

    return sum + remainingAmount * toNumber(order.price);
  }, 0);
}

function getTreasuryReserves(
  accounts: Array<{
    asset: string;
    balance: Prisma.Decimal;
    lockedBalance: Prisma.Decimal;
  }>
): TreasuryReserveSnapshot {
  return {
    rub: getAccountTotal(accounts, "RUB"),
    usd: getAccountTotal(accounts, "USD"),
    usdt: getAccountTotal(accounts, "USDT"),
    xcp: getAccountTotal(accounts, "XCP"),
  };
}

function getAccountTotal(
  accounts: Array<{
    asset: string;
    balance: Prisma.Decimal;
    lockedBalance: Prisma.Decimal;
  }>,
  asset: string
) {
  const account = accounts.find((item) => item.asset === asset);

  if (!account) {
    return 0;
  }

  return toNumber(account.balance) + toNumber(account.lockedBalance);
}

function getUserKindTradeShare(
  trades: Array<{
    buyerUserId: string;
    sellerUserId: string;
  }>,
  userKindById: Map<string, string>
): UserKindShare {
  const totals = {
    aiAgent: 0,
    human: 0,
    treasury: 0,
  };

  for (const trade of trades) {
    incrementUserKindShare(userKindById, totals, trade.buyerUserId);
    incrementUserKindShare(userKindById, totals, trade.sellerUserId);
  }

  const total = totals.aiAgent + totals.human + totals.treasury;

  if (total <= 0) {
    return totals;
  }

  return {
    aiAgent: totals.aiAgent / total,
    human: totals.human / total,
    treasury: totals.treasury / total,
  };
}

function incrementUserKindShare(
  userKindById: Map<string, string>,
  totals: UserKindShare,
  userId: string
) {
  const kind = userKindById.get(userId);

  if (kind === "TREASURY") {
    totals.treasury += 1;
  } else if (kind === "AI_AGENT") {
    totals.aiAgent += 1;
  } else {
    totals.human += 1;
  }
}

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}
