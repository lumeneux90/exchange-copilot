export type PortfolioHolding = {
  ticker: string;
  quantity: number;
  averagePrice: number;
};

export type PortfolioTransferCurrency = "RUB" | "USD";

export type PortfolioState = {
  cashBalance: number;
  usdCashBalance: number;
  holdings: PortfolioHolding[];
};

export function emptyPortfolioState(): PortfolioState {
  return {
    cashBalance: 0,
    usdCashBalance: 0,
    holdings: [],
  };
}
