"use server";

import {
  depositFunds,
  getPortfolioState,
  tradeCurrency,
  tradeStock,
} from "@/src/features/portfolio/model/portfolio-server";
import { getCurrencyRates } from "@/src/entities/market/api/get-currency-rates";
import { getStocks } from "@/src/entities/stock/api/get-stocks";
import { getErrorMessage } from "@/src/lib/errors";
import { getCurrentUser } from "@/src/lib/session";
import type { PortfolioState } from "@/src/features/portfolio/model/types";

const MAX_QUOTE_DEVIATION = 0.005;
const SERVER_STOCK_LOOKUP_LIMIT = 500;

async function requireCurrentUserId() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Пользователь не авторизован.");
  }

  return user.id;
}

function assertQuoteWithinTolerance(params: {
  executionValue: number;
  quotedValue: number;
}) {
  const { executionValue, quotedValue } = params;

  if (
    !Number.isFinite(executionValue) ||
    executionValue <= 0 ||
    !Number.isFinite(quotedValue) ||
    quotedValue <= 0
  ) {
    throw new Error("Некорректная котировка сделки.");
  }

  const deviation = Math.abs(executionValue - quotedValue) / executionValue;

  if (deviation > MAX_QUOTE_DEVIATION) {
    throw new Error("Цена изменилась. Обновите сделку и попробуйте снова.");
  }
}

async function getExecutionStockPrice(ticker: string, quotedPrice: number) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const stocks = await getStocks({ limit: SERVER_STOCK_LOOKUP_LIMIT });
  const stock = stocks.find((item) => item.ticker === normalizedTicker);

  if (!stock) {
    throw new Error("Не удалось получить актуальную цену бумаги.");
  }

  assertQuoteWithinTolerance({
    executionValue: stock.price,
    quotedValue: quotedPrice,
  });

  return stock.price;
}

async function getExecutionCurrencyRate(code: string, quotedRate: number) {
  const normalizedCode = code.trim().toUpperCase();
  const currencyRates = await getCurrencyRates();
  const currencyRate = currencyRates.find(
    (rate) =>
      rate.code === normalizedCode ||
      (rate.label.split("/")[0] ?? rate.code) === normalizedCode
  );

  if (!currencyRate) {
    throw new Error("Не удалось получить актуальный курс валюты.");
  }

  assertQuoteWithinTolerance({
    executionValue: currencyRate.price,
    quotedValue: quotedRate,
  });

  return currencyRate.price;
}

export async function getPortfolioStateAction() {
  const userId = await requireCurrentUserId();

  return getPortfolioState(userId);
}

type PortfolioActionResult =
  | { ok: true; portfolio: PortfolioState }
  | { ok: false; error: string };

export async function depositFundsAction(amount: number) {
  try {
    const userId = await requireCurrentUserId();
    const portfolio = await depositFunds({
      userId,
      amount,
    });

    return {
      ok: true,
      portfolio,
    } satisfies PortfolioActionResult;
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Не удалось пополнить счет."),
    } satisfies PortfolioActionResult;
  }
}

export async function tradeCurrencyAction(params: {
  code: string;
  side: "buy" | "sell";
  amount: number;
  quotedRate: number;
}) {
  try {
    const userId = await requireCurrentUserId();
    const rate = await getExecutionCurrencyRate(params.code, params.quotedRate);
    const portfolio = await tradeCurrency({
      userId,
      amount: params.amount,
      code: params.code,
      rate,
      side: params.side,
    });

    return {
      ok: true,
      portfolio,
    } satisfies PortfolioActionResult;
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Не удалось выполнить валютную сделку."),
    } satisfies PortfolioActionResult;
  }
}

export async function tradeStockAction(params: {
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  quotedPrice: number;
}) {
  try {
    const userId = await requireCurrentUserId();
    const price = await getExecutionStockPrice(params.ticker, params.quotedPrice);
    const portfolio = await tradeStock({
      userId,
      price,
      quantity: params.quantity,
      side: params.side,
      ticker: params.ticker,
    });

    return {
      ok: true,
      portfolio,
    } satisfies PortfolioActionResult;
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Не удалось выполнить сделку по акции."),
    } satisfies PortfolioActionResult;
  }
}
