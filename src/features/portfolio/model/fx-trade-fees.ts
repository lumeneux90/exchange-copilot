const FX_FEE_RATE = 0.003;
const FX_FEE_MINIMUM = 5;

export function calculateFxTradeFee(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.max(FX_FEE_MINIMUM, amount * FX_FEE_RATE);
}
