"use server";

import { revalidatePath } from "next/cache";

import {
  acceptFinancialOrder,
  cancelFinancialOrder,
  createFinancialOrder,
  getFinanceState,
} from "@/src/features/finance/model/finance-server";
import {
  emptyFinanceState,
  type FinanceAsset,
  type FinanceState,
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

export async function getFinanceStateAction(): Promise<FinanceState> {
  const user = await getCurrentUser();

  if (!user) {
    return emptyFinanceState();
  }

  return getFinanceState(user.id);
}

export async function createFinancialOrderAction(params: {
  amount: number;
  asset: FinanceAsset;
}): Promise<FinanceActionResult> {
  try {
    const user = await requireCurrentUser();

    await createFinancialOrder({
      ...params,
      creatorUserId: user.id,
    });
    const finance = await getFinanceState(user.id);

    revalidatePath("/finances");

    return { ok: true, finance };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Не удалось создать ордер."),
    };
  }
}

export async function acceptFinancialOrderAction(
  orderId: string
): Promise<FinanceActionResult> {
  try {
    const user = await requireCurrentUser();

    await acceptFinancialOrder({
      orderId,
      userId: user.id,
    });
    const finance = await getFinanceState(user.id);

    revalidatePath("/finances");

    return { ok: true, finance };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Не удалось принять ордер."),
    };
  }
}

export async function cancelFinancialOrderAction(
  orderId: string
): Promise<FinanceActionResult> {
  try {
    const user = await requireCurrentUser();

    await cancelFinancialOrder({
      orderId,
      userId: user.id,
    });
    const finance = await getFinanceState(user.id);

    revalidatePath("/finances");

    return { ok: true, finance };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Не удалось отменить ордер."),
    };
  }
}
