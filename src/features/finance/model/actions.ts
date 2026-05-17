"use server";

import { revalidatePath } from "next/cache";

import {
  cancelFinancialOrder,
  createFinancialOrder,
  getFinanceState,
} from "@/src/features/finance/model/finance-server";
import {
  emptyFinanceState,
  type FinanceState,
  type FinancialOrderSide,
} from "@/src/features/finance/model/types";
import { getErrorMessage } from "@/src/lib/errors";
import { getCurrentUser } from "@/src/lib/session";

async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Пользователь не авторизован.");
  }

  return user;
}

type FinanceActionResult =
  | { ok: true; finance: FinanceState }
  | { ok: false; error: string };

export async function getFinanceStateAction(
  selectedPairSymbol?: string
): Promise<FinanceState> {
  const user = await getCurrentUser();

  if (!user) {
    return emptyFinanceState();
  }

  return getFinanceState(user.id, selectedPairSymbol);
}

export async function createFinancialOrderAction(params: {
  amount: number;
  pairSymbol?: string;
  price: number;
  side: FinancialOrderSide;
}): Promise<FinanceActionResult> {
  try {
    const user = await requireCurrentUser();

    await createFinancialOrder({
      ...params,
      creatorUserId: user.id,
    });
    const finance = await getFinanceState(user.id, params.pairSymbol);

    revalidatePath("/finances");

    return { ok: true, finance };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Не удалось создать ордер."),
    };
  }
}

export async function cancelFinancialOrderAction(
  orderId: string,
  selectedPairSymbol?: string
): Promise<FinanceActionResult> {
  try {
    const user = await requireCurrentUser();

    await cancelFinancialOrder({
      orderId,
      userId: user.id,
    });
    const finance = await getFinanceState(user.id, selectedPairSymbol);

    revalidatePath("/finances");

    return { ok: true, finance };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Не удалось отменить ордер."),
    };
  }
}
