export const MIN_DEPOSIT_AMOUNT = 1;
export const MAX_DEPOSIT_AMOUNT = 200_000;
export const DEPOSIT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const WEEKLY_DEPOSIT_LIMIT = 500_000;
export const MONTHLY_DEPOSIT_LIMIT = 1_400_000;
export const WEEKLY_DEPOSIT_WINDOW_DAYS = 7;
export const MONTHLY_DEPOSIT_WINDOW_DAYS = 30;

export function getDepositCooldownMinutes() {
  return Math.ceil(DEPOSIT_COOLDOWN_MS / 60_000);
}

export function getDepositCooldownHours() {
  return Math.ceil(DEPOSIT_COOLDOWN_MS / 3_600_000);
}

export function getRemainingCooldownMs(lastDepositAt: Date, now = new Date()) {
  const elapsedMs = now.getTime() - lastDepositAt.getTime();

  return Math.max(0, DEPOSIT_COOLDOWN_MS - elapsedMs);
}

export function getRemainingCooldownMinutes(lastDepositAt: Date, now = new Date()) {
  return Math.ceil(getRemainingCooldownMs(lastDepositAt, now) / 60_000);
}

export function getWindowStart(days: number, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
