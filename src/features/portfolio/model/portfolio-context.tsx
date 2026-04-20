"use client";

import * as React from "react";

import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import type { Stock } from "@/src/entities/stock/model/types";
import {
  depositFundsAction,
  getPortfolioStateAction,
  tradeCurrencyAction,
  tradeStockAction,
} from "@/src/features/portfolio/model/actions";
import {
  emptyPortfolioState,
  type PortfolioCurrencyBalance,
  type PortfolioHolding,
  type PortfolioState,
} from "@/src/features/portfolio/model/types";

type PortfolioContextValue = {
  portfolio: PortfolioState;
  isPending: boolean;
  refreshPortfolio: () => Promise<void>;
  depositFunds: (amount: number) => Promise<void>;
  tradeCurrency: (params: {
    code: string;
    side: "buy" | "sell";
    amount: number;
    rate: number;
  }) => Promise<void>;
  tradeStock: (params: {
    ticker: string;
    side: "buy" | "sell";
    quantity: number;
    price: number;
  }) => Promise<void>;
};

type PortfolioHoldingSnapshot = PortfolioHolding & {
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  profitLoss: number;
  profitLossPercent: number;
};

export type PortfolioSnapshot = {
  cashBalance: number;
  currenciesMarketValue: number;
  investedAmount: number;
  marketValue: number;
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  positionsCount: number;
  currencyPositionsCount: number;
  currencies: Array<
    PortfolioCurrencyBalance & {
      currentRate: number;
      marketValue: number;
      costBasis: number;
      profitLoss: number;
      profitLossPercent: number;
    }
  >;
  holdings: PortfolioHoldingSnapshot[];
};

const PortfolioContext = React.createContext<PortfolioContextValue | null>(
  null
);

export function buildPortfolioSnapshot(
  portfolio: PortfolioState,
  stocks: Stock[],
  currencyRates: CurrencyRate[] = []
): PortfolioSnapshot {
  const pricesByTicker = new Map(stocks.map((stock) => [stock.ticker, stock]));
  const ratesByCode = new Map(
    currencyRates.map((rate) => [rate.label.split("/")[0] ?? rate.code, rate])
  );

  const holdings = portfolio.holdings.map((holding) => {
    const stock = pricesByTicker.get(holding.ticker);
    const currentPrice = stock?.price ?? holding.averagePrice;
    const marketValue = currentPrice * holding.quantity;
    const costBasis = holding.averagePrice * holding.quantity;
    const profitLoss = marketValue - costBasis;
    const profitLossPercent =
      costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

    return {
      ...holding,
      currentPrice,
      marketValue,
      costBasis,
      profitLoss,
      profitLossPercent,
    };
  });

  const currencies = portfolio.currencies.map((currency) => {
    const rate = ratesByCode.get(currency.code);
    const currentRate = rate?.price ?? currency.averageRate;
    const marketValue = currentRate * currency.quantity;
    const costBasis = currency.averageRate * currency.quantity;
    const profitLoss = marketValue - costBasis;
    const profitLossPercent =
      costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

    return {
      ...currency,
      currentRate,
      marketValue,
      costBasis,
      profitLoss,
      profitLossPercent,
    };
  });

  const investedAmount = holdings.reduce(
    (sum, holding) => sum + holding.costBasis,
    0
  );
  const currenciesCostBasis = currencies.reduce(
    (sum, currency) => sum + currency.costBasis,
    0
  );
  const marketValue = holdings.reduce(
    (sum, holding) => sum + holding.marketValue,
    0
  );
  const currenciesMarketValue = currencies.reduce(
    (sum, currency) => sum + currency.marketValue,
    0
  );
  const totalValue =
    portfolio.cashBalance + marketValue + currenciesMarketValue;
  const totalProfitLoss =
    marketValue +
    currenciesMarketValue -
    (investedAmount + currenciesCostBasis);
  const totalProfitLossPercent =
    investedAmount + currenciesCostBasis > 0
      ? (totalProfitLoss / (investedAmount + currenciesCostBasis)) * 100
      : 0;

  return {
    cashBalance: portfolio.cashBalance,
    currenciesMarketValue,
    investedAmount,
    marketValue,
    totalValue,
    totalProfitLoss,
    totalProfitLossPercent,
    positionsCount: holdings.length,
    currencyPositionsCount: currencies.length,
    currencies: currencies.sort(
      (left, right) => right.marketValue - left.marketValue
    ),
    holdings: holdings.sort(
      (left, right) => right.marketValue - left.marketValue
    ),
  };
}

export function PortfolioProvider({
  children,
  initialPortfolio,
}: {
  children: React.ReactNode;
  initialPortfolio?: PortfolioState | null;
}) {
  const [portfolio, setPortfolio] = React.useState<PortfolioState>(
    initialPortfolio ?? emptyPortfolioState()
  );
  const [isPending, setIsPending] = React.useState(false);

  const refreshPortfolio = React.useCallback(async () => {
    setIsPending(true);

    try {
      const nextPortfolio = await getPortfolioStateAction();
      setPortfolio(nextPortfolio);
    } finally {
      setIsPending(false);
    }
  }, []);

  const depositFunds = React.useCallback(async (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Введите корректную сумму пополнения.");
    }

    setIsPending(true);

    try {
      const result = await depositFundsAction(amount);

      if (!result.ok) {
        throw new Error(result.error);
      }

      setPortfolio(result.portfolio);
    } finally {
      setIsPending(false);
    }
  }, []);

  const tradeCurrency = React.useCallback(
    async ({
      amount,
      code,
      side,
      rate,
    }: {
      amount: number;
      code: string;
      side: "buy" | "sell";
      rate: number;
    }) => {
      if (
        !code ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !Number.isFinite(rate) ||
        rate <= 0
      ) {
        throw new Error("Некорректные параметры валютной сделки.");
      }

      setIsPending(true);

      try {
        const result = await tradeCurrencyAction({
          amount,
          code,
          side,
          rate,
        });

        if (!result.ok) {
          throw new Error(result.error);
        }

        setPortfolio(result.portfolio);
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  const tradeStock = React.useCallback(
    async ({
      price,
      quantity,
      side,
      ticker,
    }: {
      ticker: string;
      side: "buy" | "sell";
      quantity: number;
      price: number;
    }) => {
      if (
        !ticker ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(quantity) ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        throw new Error("Некорректные параметры сделки по акции.");
      }

      setIsPending(true);

      try {
        const result = await tradeStockAction({
          price,
          quantity,
          side,
          ticker,
        });

        if (!result.ok) {
          throw new Error(result.error);
        }

        setPortfolio(result.portfolio);
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  const value = React.useMemo(
    () => ({
      portfolio,
      isPending,
      refreshPortfolio,
      depositFunds,
      tradeCurrency,
      tradeStock,
    }),
    [
      depositFunds,
      isPending,
      portfolio,
      refreshPortfolio,
      tradeCurrency,
      tradeStock,
    ]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = React.useContext(PortfolioContext);

  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider.");
  }

  return context;
}
