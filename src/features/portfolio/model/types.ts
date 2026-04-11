export type PortfolioHolding = {
  ticker: string;
  quantity: number;
  averagePrice: number;
};

export type PortfolioCurrencyBalance = {
  code: string;
  quantity: number;
  averageRate: number;
};

export type PortfolioState = {
  cashBalance: number;
  currencies: PortfolioCurrencyBalance[];
  holdings: PortfolioHolding[];
};

export function emptyPortfolioState(): PortfolioState {
  return {
    cashBalance: 0,
    currencies: [],
    holdings: [],
  };
}
