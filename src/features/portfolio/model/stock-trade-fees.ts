const STOCK_FEE_RATE = 0.003;
const STOCK_FEE_MINIMUM = 5;

export function calculateStockTradeFee(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.max(STOCK_FEE_MINIMUM, amount * STOCK_FEE_RATE);
}
