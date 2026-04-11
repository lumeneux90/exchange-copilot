export type PortfolioHistoryItem = {
  id: string;
  type: "DEPOSIT" | "BUY" | "SELL" | "FX_BUY" | "FX_SELL";
  ticker: string | null;
  currencyCode: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  feeAmount: number;
  executedAt: string;
};
