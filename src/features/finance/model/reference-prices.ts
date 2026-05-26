export type ReferencePriceSource = "CBR" | "BINANCE" | "INTERNAL";

export type ReferencePriceRule = {
  fallbackPrice: number;
  hardBandBps: number;
  maxMovePerHourBps: number;
  softBandBps: number;
  source: ReferencePriceSource;
  sourceSymbol?: string;
  symbol: string;
};

export type ReferencePriceQuote = ReferencePriceRule & {
  price: number;
  resolvedAt: Date;
  stale: boolean;
};

const BASIS_POINTS = 10_000;
const CBR_CACHE_TTL_MS = 60 * 60 * 1000;
const BINANCE_CACHE_TTL_MS = 30 * 1000;
const REFERENCE_PRICE_TIMEOUT_MS = 2_000;

const REFERENCE_PRICE_RULES = [
  {
    symbol: "USD/RUB",
    source: "CBR",
    sourceSymbol: "USD",
    fallbackPrice: 71.668,
    softBandBps: 150,
    hardBandBps: 500,
    maxMovePerHourBps: 100,
  },
  {
    symbol: "USD/USDT",
    source: "INTERNAL",
    fallbackPrice: 1,
    softBandBps: 30,
    hardBandBps: 200,
    maxMovePerHourBps: 50,
  },
  {
    symbol: "BTC/USDT",
    source: "BINANCE",
    sourceSymbol: "BTCUSDT",
    fallbackPrice: 68_000,
    softBandBps: 250,
    hardBandBps: 1_000,
    maxMovePerHourBps: 600,
  },
  {
    symbol: "ETH/USDT",
    source: "BINANCE",
    sourceSymbol: "ETHUSDT",
    fallbackPrice: 3_600,
    softBandBps: 300,
    hardBandBps: 1_200,
    maxMovePerHourBps: 700,
  },
  {
    symbol: "BNB/USDT",
    source: "BINANCE",
    sourceSymbol: "BNBUSDT",
    fallbackPrice: 600,
    softBandBps: 350,
    hardBandBps: 1_500,
    maxMovePerHourBps: 800,
  },
  {
    symbol: "SOL/USDT",
    source: "BINANCE",
    sourceSymbol: "SOLUSDT",
    fallbackPrice: 170,
    softBandBps: 500,
    hardBandBps: 2_000,
    maxMovePerHourBps: 1_000,
  },
  {
    symbol: "DOGE/USDT",
    source: "BINANCE",
    sourceSymbol: "DOGEUSDT",
    fallbackPrice: 0.155,
    softBandBps: 800,
    hardBandBps: 3_000,
    maxMovePerHourBps: 1_500,
  },
  {
    symbol: "TON/USDT",
    source: "BINANCE",
    sourceSymbol: "TONUSDT",
    fallbackPrice: 3.8,
    softBandBps: 800,
    hardBandBps: 3_000,
    maxMovePerHourBps: 1_500,
  },
  {
    symbol: "XCP/USDT",
    source: "INTERNAL",
    fallbackPrice: 1,
    softBandBps: 800,
    hardBandBps: 3_000,
    maxMovePerHourBps: 1_500,
  },
  {
    symbol: "XCP/RUB",
    source: "INTERNAL",
    fallbackPrice: 100,
    softBandBps: 800,
    hardBandBps: 3_000,
    maxMovePerHourBps: 1_500,
  },
  {
    symbol: "XCP/USD",
    source: "INTERNAL",
    fallbackPrice: 1,
    softBandBps: 800,
    hardBandBps: 3_000,
    maxMovePerHourBps: 1_500,
  },
] satisfies ReferencePriceRule[];

const quoteCache = new Map<
  string,
  {
    price: number;
    resolvedAt: Date;
  }
>();

export function getReferencePriceRule(symbol: string) {
  return REFERENCE_PRICE_RULES.find((rule) => rule.symbol === symbol) ?? null;
}

export async function getReferencePriceQuote(
  symbol: string
): Promise<ReferencePriceQuote | null> {
  const rule = getReferencePriceRule(symbol);

  if (!rule) {
    return null;
  }

  if (rule.source === "INTERNAL") {
    return {
      ...rule,
      price: rule.fallbackPrice,
      resolvedAt: new Date(),
      stale: false,
    };
  }

  const cached = getCachedQuote(rule);

  if (cached) {
    return {
      ...rule,
      ...cached,
      stale: false,
    };
  }

  const externalPrice =
    rule.source === "CBR"
      ? await fetchCbrUsdRubRate()
      : await fetchBinanceAveragePrice(rule.sourceSymbol);

  if (externalPrice != null) {
    const resolvedAt = new Date();

    quoteCache.set(rule.symbol, {
      price: externalPrice,
      resolvedAt,
    });

    return {
      ...rule,
      price: externalPrice,
      resolvedAt,
      stale: false,
    };
  }

  return {
    ...rule,
    price: rule.fallbackPrice,
    resolvedAt: new Date(),
    stale: true,
  };
}

export async function assertPriceWithinReferenceBand(
  symbol: string,
  price: number
) {
  const quote = await getReferencePriceQuote(symbol);

  if (!quote) {
    return;
  }

  const minPrice = quote.price * (1 - quote.hardBandBps / BASIS_POINTS);
  const maxPrice = quote.price * (1 + quote.hardBandBps / BASIS_POINTS);

  if (price + Number.EPSILON < minPrice || price > maxPrice + Number.EPSILON) {
    throw new Error(
      `Цена вне допустимого коридора для ${symbol}: ${formatPriceRange(
        minPrice,
        maxPrice
      )}. Reference: ${formatReferencePrice(quote.price)}.`
    );
  }
}

function getCachedQuote(rule: ReferencePriceRule) {
  const cached = quoteCache.get(rule.symbol);

  if (!cached) {
    return null;
  }

  const ttl = rule.source === "CBR" ? CBR_CACHE_TTL_MS : BINANCE_CACHE_TTL_MS;
  const ageMs = Date.now() - cached.resolvedAt.getTime();

  return ageMs <= ttl ? cached : null;
}

async function fetchCbrUsdRubRate() {
  const xml = await fetchText("https://www.cbr.ru/scripts/XML_daily.asp");

  if (!xml) {
    return null;
  }

  const usdMatch = xml.match(
    /<Valute[^>]*>\s*<NumCode>840<\/NumCode>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d,]+)<\/Value>/
  );

  if (!usdMatch) {
    return null;
  }

  const nominal = Number(usdMatch[1]);
  const value = Number(usdMatch[2].replace(",", "."));

  if (!Number.isFinite(nominal) || nominal <= 0 || !Number.isFinite(value)) {
    return null;
  }

  return value / nominal;
}

async function fetchBinanceAveragePrice(sourceSymbol: string | undefined) {
  if (!sourceSymbol) {
    return null;
  }

  const json = await fetchJson(
    `https://api.binance.com/api/v3/avgPrice?symbol=${sourceSymbol}`
  );

  if (!isRecord(json) || typeof json.price !== "string") {
    return null;
  }

  const price = Number(json.price);

  return Number.isFinite(price) && price > 0 ? price : null;
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REFERENCE_PRICE_TIMEOUT_MS),
    });

    return response.ok ? response.text() : null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string) {
  const text = await fetchText(url);

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatPriceRange(minPrice: number, maxPrice: number) {
  return `${formatReferencePrice(minPrice)}-${formatReferencePrice(maxPrice)}`;
}

function formatReferencePrice(price: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 8,
    minimumFractionDigits: 0,
  }).format(price);
}
