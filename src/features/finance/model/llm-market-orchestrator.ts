import {
  normalizeMarketMode,
  type MarketMode,
} from "@/src/features/finance/model/ai-market-agent-rules";
import type { MarketSnapshot } from "@/src/features/finance/model/market-orchestrator";

type LlmMarketModeResult =
  | {
      mode: MarketMode;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 8_000;
const REQUEST_RETRIES = 2;

const MARKET_MODE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "mode",
    "durationMinutes",
    "riskAppetite",
    "xcpAttention",
    "volatilityMultiplier",
    "liquidityMultiplier",
    "retailBias",
    "treasuryBias",
  ],
  properties: {
    mode: {
      type: "string",
      enum: [
        "balanced_market",
        "xcp_hype",
        "xcp_treasury_support",
        "risk_off",
        "thin_liquidity",
      ],
    },
    durationMinutes: {
      type: "number",
      minimum: 5,
      maximum: 120,
    },
    riskAppetite: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    xcpAttention: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    volatilityMultiplier: {
      type: "number",
      minimum: 0.25,
      maximum: 3,
    },
    liquidityMultiplier: {
      type: "number",
      minimum: 0.25,
      maximum: 3,
    },
    retailBias: {
      type: "string",
      enum: ["neutral", "accumulate", "distribute", "risk_off", "buy_dips"],
    },
    treasuryBias: {
      type: "string",
      enum: ["neutral", "support", "cooldown", "conserve", "pause"],
    },
  },
};

export async function tryGetLlmMarketMode(
  snapshot: MarketSnapshot
): Promise<LlmMarketModeResult> {
  if (!isLlmMarketOrchestratorEnabled()) {
    return {
      error: "LLM market orchestrator is disabled.",
      ok: false,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      error: "OPENAI_API_KEY is not configured.",
      ok: false,
    };
  }

  try {
    const response = await requestMarketMode(apiKey, snapshot);

    if (!response.ok) {
      const errorText = await response.text();

      return {
        error: `OpenAI Responses API returned ${response.status}: ${truncateErrorText(errorText)}`,
        ok: false,
      };
    }

    const body = (await response.json()) as unknown;
    const text = extractResponseText(body);

    if (!text) {
      return {
        error: "OpenAI response did not include output text.",
        ok: false,
      };
    }

    const parsed = JSON.parse(text) as unknown;

    return {
      mode: normalizeMarketMode(parsed),
      ok: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "LLM request failed.",
      ok: false,
    };
  }
}

async function requestMarketMode(apiKey: string, snapshot: MarketSnapshot) {
  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      body: JSON.stringify({
        input: [
          {
            role: "system",
            content: getSystemPrompt(),
          },
          {
            role: "user",
            content: JSON.stringify(toLlmSnapshot(snapshot)),
          },
        ],
        model: process.env.AI_MARKET_ORCHESTRATOR_MODEL ?? DEFAULT_MODEL,
        text: {
          format: {
            type: "json_schema",
            name: "market_mode_decision",
            strict: true,
            schema: MARKET_MODE_JSON_SCHEMA,
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status < 500 || attempt === REQUEST_RETRIES) {
      return response;
    }

    await delay(250 * attempt);
  }

  throw new Error("OpenAI Responses API request did not complete.");
}

function isLlmMarketOrchestratorEnabled() {
  return process.env.AI_MARKET_ORCHESTRATOR_ENABLED === "true";
}

function getSystemPrompt() {
  return [
    "You are a market-mode orchestrator for a virtual exchange simulation.",
    "Return only JSON matching the provided schema.",
    "You do not create orders, prices, users, balances, or trading signals.",
    "You only choose probability-bias parameters for deterministic AI users and treasury policy.",
    "Reference prices and hard price guards are controlled by application code, not by you.",
    "Prefer conservative decisions when data is thin, treasury reserves are low, or spreads are unstable.",
    "Treasury support means limited liquidity support within reserves and caps, never a guaranteed price.",
  ].join(" ");
}

function toLlmSnapshot(snapshot: MarketSnapshot) {
  return {
    capturedAt: snapshot.capturedAt,
    previousMode: snapshot.mode,
    pairs: snapshot.pairs.map((pair) => ({
      depthQuoteAmount: pair.depthQuoteAmount,
      lastPrice: pair.lastPrice,
      referencePrice: pair.referencePrice,
      referenceSource: pair.referenceSource,
      spreadBps: pair.spreadBps,
      symbol: pair.symbol,
      tradeCount60m: pair.tradeCount60m,
      volume60m: pair.volume60m,
    })),
    treasuryReserves: snapshot.treasuryReserves,
    userKindTradeShare60m: snapshot.userKindTradeShare60m,
    xcp: snapshot.xcp,
  };
}

function extractResponseText(body: unknown) {
  if (!isRecord(body)) {
    return null;
  }

  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  if (!Array.isArray(body.output)) {
    return null;
  }

  for (const outputItem of body.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (
        isRecord(contentItem) &&
        contentItem.type === "output_text" &&
        typeof contentItem.text === "string"
      ) {
        return contentItem.text;
      }
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncateErrorText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > 500
    ? `${normalized.slice(0, 500)}...`
    : normalized;
}
