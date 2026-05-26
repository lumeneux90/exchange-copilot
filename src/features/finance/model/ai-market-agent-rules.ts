import type { FinanceAsset } from "@/src/features/finance/model/types";

export type MarketModeName =
  | "balanced_market"
  | "xcp_hype"
  | "xcp_treasury_support"
  | "risk_off"
  | "thin_liquidity";

export type RetailBias =
  | "neutral"
  | "accumulate"
  | "distribute"
  | "risk_off"
  | "buy_dips";

export type TreasuryBias =
  | "neutral"
  | "support"
  | "cooldown"
  | "conserve"
  | "pause";

export type SyntheticTraderArchetype =
  | "MARKET_MAKER"
  | "RETAIL"
  | "DIP_BUYER"
  | "MOMENTUM"
  | "WHALE";

export type AgentUserKind = "TREASURY" | "AI_AGENT";

export type SyntheticTraderProfile = {
  activityRate: number;
  archetype: SyntheticTraderArchetype;
  dipSensitivity: number;
  enabled: boolean;
  liquidityRole: number;
  login: string;
  maxOpenOrders: number;
  maxOrderShare: number;
  orderSize: number;
  patience: number;
  preferredPairs: string[];
  randomness: number;
  riskTolerance: number;
  trendSensitivity: number;
  xcpInterest: number;
};

export type TreasuryPolicy = {
  maxOpenOrdersPerPair: number;
  maxRubSpendPerDay: number;
  maxRubSpendPerTick: number;
  maxUsdSpendPerDay: number;
  maxUsdSpendPerTick: number;
  maxXcpSellPerTick: number;
  minRubReserve: number;
  minUsdReserve: number;
  targetSpreadBps: number;
};

export type MarketMode = {
  durationMinutes: number;
  liquidityMultiplier: number;
  mode: MarketModeName;
  retailBias: RetailBias;
  riskAppetite: number;
  treasuryBias: TreasuryBias;
  volatilityMultiplier: number;
  xcpAttention: number;
};

export type AgentUserSeed = {
  kind: AgentUserKind;
  login: string;
};

export const TREASURY_LOGIN = "__treasury__";

export const XCP_TREASURY_PAIRS = ["XCP/USDT", "XCP/USD", "XCP/RUB"] as const;

export const AI_MARKET_AGENT_USER_SEEDS = [
  {
    kind: "TREASURY",
    login: TREASURY_LOGIN,
  },
  {
    kind: "AI_AGENT",
    login: "ai_maker_btc",
  },
  {
    kind: "AI_AGENT",
    login: "ai_maker_xcp",
  },
  {
    kind: "AI_AGENT",
    login: "ai_retail_01",
  },
  {
    kind: "AI_AGENT",
    login: "ai_retail_02",
  },
  {
    kind: "AI_AGENT",
    login: "ai_dip_01",
  },
  {
    kind: "AI_AGENT",
    login: "ai_momentum_01",
  },
  {
    kind: "AI_AGENT",
    login: "ai_whale_01",
  },
] satisfies AgentUserSeed[];

export const DEFAULT_TREASURY_POLICY = {
  maxOpenOrdersPerPair: 6,
  maxRubSpendPerDay: 250_000,
  maxRubSpendPerTick: 25_000,
  maxUsdSpendPerDay: 3_000,
  maxUsdSpendPerTick: 300,
  maxXcpSellPerTick: 400,
  minRubReserve: 100_000,
  minUsdReserve: 2_000,
  targetSpreadBps: 180,
} satisfies TreasuryPolicy;

export const FALLBACK_MARKET_MODE = {
  durationMinutes: 30,
  liquidityMultiplier: 1,
  mode: "balanced_market",
  retailBias: "neutral",
  riskAppetite: 0.5,
  treasuryBias: "neutral",
  volatilityMultiplier: 1,
  xcpAttention: 0.35,
} satisfies MarketMode;

export const SYNTHETIC_TRADER_PROFILES = [
  {
    login: "ai_maker_btc",
    archetype: "MARKET_MAKER",
    enabled: true,
    preferredPairs: ["BTC/USDT", "ETH/USDT", "USD/USDT"],
    activityRate: 0.85,
    orderSize: 0.08,
    maxOrderShare: 0.14,
    maxOpenOrders: 8,
    riskTolerance: 0.5,
    xcpInterest: 0.1,
    patience: 0.8,
    trendSensitivity: 0.2,
    dipSensitivity: 0.25,
    liquidityRole: 0.9,
    randomness: 0.08,
  },
  {
    login: "ai_maker_xcp",
    archetype: "MARKET_MAKER",
    enabled: true,
    preferredPairs: ["XCP/USDT", "XCP/USD", "XCP/RUB"],
    activityRate: 0.9,
    orderSize: 0.12,
    maxOrderShare: 0.18,
    maxOpenOrders: 8,
    riskTolerance: 0.45,
    xcpInterest: 0.9,
    patience: 0.8,
    trendSensitivity: 0.2,
    dipSensitivity: 0.35,
    liquidityRole: 0.95,
    randomness: 0.05,
  },
  {
    login: "ai_retail_01",
    archetype: "RETAIL",
    enabled: true,
    preferredPairs: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "DOGE/USDT"],
    activityRate: 0.22,
    orderSize: 0.04,
    maxOrderShare: 0.1,
    maxOpenOrders: 2,
    riskTolerance: 0.55,
    xcpInterest: 0.25,
    patience: 0.35,
    trendSensitivity: 0.25,
    dipSensitivity: 0.25,
    liquidityRole: 0.05,
    randomness: 0.5,
  },
  {
    login: "ai_retail_02",
    archetype: "RETAIL",
    enabled: true,
    preferredPairs: ["BTC/USDT", "SOL/USDT", "XCP/USDT"],
    activityRate: 0.25,
    orderSize: 0.05,
    maxOrderShare: 0.12,
    maxOpenOrders: 2,
    riskTolerance: 0.65,
    xcpInterest: 0.55,
    patience: 0.35,
    trendSensitivity: 0.25,
    dipSensitivity: 0.3,
    liquidityRole: 0.05,
    randomness: 0.45,
  },
  {
    login: "ai_dip_01",
    archetype: "DIP_BUYER",
    enabled: true,
    preferredPairs: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XCP/USD"],
    activityRate: 0.32,
    orderSize: 0.07,
    maxOrderShare: 0.15,
    maxOpenOrders: 3,
    riskTolerance: 0.6,
    xcpInterest: 0.45,
    patience: 0.7,
    trendSensitivity: 0.1,
    dipSensitivity: 0.85,
    liquidityRole: 0.2,
    randomness: 0.22,
  },
  {
    login: "ai_momentum_01",
    archetype: "MOMENTUM",
    enabled: true,
    preferredPairs: ["BTC/USDT", "ETH/USDT", "BNB/USDT", "XCP/USDT"],
    activityRate: 0.35,
    orderSize: 0.08,
    maxOrderShare: 0.16,
    maxOpenOrders: 3,
    riskTolerance: 0.72,
    xcpInterest: 0.5,
    patience: 0.25,
    trendSensitivity: 0.85,
    dipSensitivity: 0.15,
    liquidityRole: 0.08,
    randomness: 0.28,
  },
  {
    login: "ai_whale_01",
    archetype: "WHALE",
    enabled: true,
    preferredPairs: ["BTC/USDT", "ETH/USDT", "XCP/USD", "XCP/RUB"],
    activityRate: 0.08,
    orderSize: 0.22,
    maxOrderShare: 0.25,
    maxOpenOrders: 2,
    riskTolerance: 0.5,
    xcpInterest: 0.65,
    patience: 0.85,
    trendSensitivity: 0.35,
    dipSensitivity: 0.45,
    liquidityRole: 0.25,
    randomness: 0.12,
  },
] satisfies SyntheticTraderProfile[];

const MARKET_MODES = [
  "balanced_market",
  "xcp_hype",
  "xcp_treasury_support",
  "risk_off",
  "thin_liquidity",
] satisfies MarketModeName[];

const RETAIL_BIASES = [
  "neutral",
  "accumulate",
  "distribute",
  "risk_off",
  "buy_dips",
] satisfies RetailBias[];

const TREASURY_BIASES = [
  "neutral",
  "support",
  "cooldown",
  "conserve",
  "pause",
] satisfies TreasuryBias[];

export function isXcpTreasuryPair(symbol: string) {
  return XCP_TREASURY_PAIRS.includes(
    symbol as (typeof XCP_TREASURY_PAIRS)[number]
  );
}

export function getSyntheticTraderProfile(login: string) {
  return SYNTHETIC_TRADER_PROFILES.find((profile) => profile.login === login);
}

export function isAiMarketAgentLogin(login: string) {
  return AI_MARKET_AGENT_USER_SEEDS.some((seed) => seed.login === login);
}

export function getSeedBalanceMultiplier(kind: AgentUserKind, login: string) {
  if (kind === "TREASURY") {
    return 12;
  }

  const profile = getSyntheticTraderProfile(login);

  if (!profile) {
    return 1;
  }

  if (profile.archetype === "WHALE") {
    return 4;
  }

  if (profile.archetype === "MARKET_MAKER") {
    return 2.5;
  }

  return 1;
}

export function getTreasurySpendAssets(policy = DEFAULT_TREASURY_POLICY) {
  return {
    RUB: {
      maxSpendPerDay: policy.maxRubSpendPerDay,
      maxSpendPerTick: policy.maxRubSpendPerTick,
      minReserve: policy.minRubReserve,
    },
    USD: {
      maxSpendPerDay: policy.maxUsdSpendPerDay,
      maxSpendPerTick: policy.maxUsdSpendPerTick,
      minReserve: policy.minUsdReserve,
    },
  } satisfies Partial<
    Record<
      FinanceAsset,
      {
        maxSpendPerDay: number;
        maxSpendPerTick: number;
        minReserve: number;
      }
    >
  >;
}

export function normalizeMarketMode(value: unknown): MarketMode {
  if (!isRecord(value)) {
    return FALLBACK_MARKET_MODE;
  }

  const mode = getEnumValue(value.mode, MARKET_MODES);
  const retailBias = getEnumValue(value.retailBias, RETAIL_BIASES);
  const treasuryBias = getEnumValue(value.treasuryBias, TREASURY_BIASES);

  if (!mode || !retailBias || !treasuryBias) {
    return FALLBACK_MARKET_MODE;
  }

  return {
    durationMinutes: clampNumber(
      value.durationMinutes,
      5,
      120,
      FALLBACK_MARKET_MODE.durationMinutes
    ),
    liquidityMultiplier: clampNumber(
      value.liquidityMultiplier,
      0.25,
      3,
      FALLBACK_MARKET_MODE.liquidityMultiplier
    ),
    mode,
    retailBias,
    riskAppetite: clampNumber(
      value.riskAppetite,
      0,
      1,
      FALLBACK_MARKET_MODE.riskAppetite
    ),
    treasuryBias,
    volatilityMultiplier: clampNumber(
      value.volatilityMultiplier,
      0.25,
      3,
      FALLBACK_MARKET_MODE.volatilityMultiplier
    ),
    xcpAttention: clampNumber(
      value.xcpAttention,
      0,
      1,
      FALLBACK_MARKET_MODE.xcpAttention
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getEnumValue<const T extends string>(
  value: unknown,
  options: readonly T[]
) {
  return typeof value === "string" && options.includes(value as T)
    ? (value as T)
    : null;
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
