export type PortfolioHistoryItem = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "BUY" | "SELL";
  ticker: string | null;
  currencyCode: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  feeAmount: number;
  executedAt: string;
};

export type PortfolioHistoryPage = {
  currentPage: number;
  items: PortfolioHistoryItem[];
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
