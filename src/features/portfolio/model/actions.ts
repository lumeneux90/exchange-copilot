"use server";

import {
  depositFunds,
  getPortfolioState,
  tradeCurrency,
  tradeStock,
} from "@/src/features/portfolio/model/portfolio-server";
import { getCurrentUser } from "@/src/lib/session";

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

export async function depositFundsAction(amount: number) {
  const userId = await requireCurrentUserId();

  return depositFunds({
    userId,
    amount,
  });
}

export async function tradeCurrencyAction(params: {
  code: string;
  side: "buy" | "sell";
  amount: number;
  rate: number;
}) {
  const userId = await requireCurrentUserId();

  return tradeCurrency({
    userId,
    ...params,
  });
}

export async function tradeStockAction(params: {
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee?: number;
}) {
  const userId = await requireCurrentUserId();

  return tradeStock({
    userId,
    ...params,
  });
}
