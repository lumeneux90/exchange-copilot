"use server";

import {
  depositFunds,
  getPortfolioState,
  tradeCurrency,
  tradeStock,
} from "@/src/features/portfolio/model/portfolio-server";
import { getErrorMessage } from "@/src/lib/errors";
import { getCurrentUser } from "@/src/lib/session";
import type { PortfolioState } from "@/src/features/portfolio/model/types";

async function requireCurrentUserId() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Пользователь не авторизован.");
  }

  return user.id;
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
  rate: number;
  fee?: number;
}) {
  try {
    const userId = await requireCurrentUserId();
    const portfolio = await tradeCurrency({
      userId,
      ...params,
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
  price: number;
  fee?: number;
}) {
  try {
    const userId = await requireCurrentUserId();
    const portfolio = await tradeStock({
      userId,
      ...params,
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
