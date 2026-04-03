"use client";

import * as React from "react";

import type { Stock } from "@/src/entities/stock/model/types";

export type PortfolioHolding = {
  ticker: string;
  quantity: number;
  averagePrice: number;
};

export type PortfolioTransactionType = "deposit" | "buy" | "sell";

export type PortfolioTransaction = {
  id: string;
  type: PortfolioTransactionType;
  amount: number;
  ticker?: string;
  quantity?: number;
  price?: number;
  createdAt: string;
  note?: string;
};

type PortfolioState = {
  cashBalance: number;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
};

type PortfolioContextValue = {
  portfolio: PortfolioState;
  depositFunds: (amount: number, note?: string) => void;
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
  investedAmount: number;
  marketValue: number;
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  positionsCount: number;
  holdings: PortfolioHoldingSnapshot[];
};

const STORAGE_KEY = "xchange-copilot-portfolio";

const defaultPortfolioState: PortfolioState = {
  cashBalance: 187540,
  holdings: [
    { ticker: "SBER", quantity: 18, averagePrice: 292.4 },
    { ticker: "LKOH", quantity: 3, averagePrice: 7148.3 },
    { ticker: "TATN", quantity: 12, averagePrice: 672.8 },
  ],
  transactions: [
    {
      id: "seed-deposit",
      type: "deposit",
      amount: 240000,
      createdAt: "2026-03-25T08:30:00.000Z",
      note: "Стартовый счет",
    },
    {
      id: "seed-buy-sber",
      type: "buy",
      amount: 5263.2,
      ticker: "SBER",
      quantity: 18,
      price: 292.4,
      createdAt: "2026-03-26T10:00:00.000Z",
    },
    {
      id: "seed-buy-lkoh",
      type: "buy",
      amount: 21444.9,
      ticker: "LKOH",
      quantity: 3,
      price: 7148.3,
      createdAt: "2026-03-27T10:40:00.000Z",
    },
    {
      id: "seed-buy-tatn",
      type: "buy",
      amount: 8073.6,
      ticker: "TATN",
      quantity: 12,
      price: 672.8,
      createdAt: "2026-03-28T12:00:00.000Z",
    },
  ],
};

const PortfolioContext = React.createContext<PortfolioContextValue | null>(
  null
);

function parseStoredPortfolio(value: string | null) {
  if (!value) {
    return defaultPortfolioState;
  }

  try {
    const parsed = JSON.parse(value) as PortfolioState;

    if (
      typeof parsed.cashBalance !== "number" ||
      !Array.isArray(parsed.holdings) ||
      !Array.isArray(parsed.transactions)
    ) {
      return defaultPortfolioState;
    }

    return parsed;
  } catch {
    return defaultPortfolioState;
  }
}

function createTransactionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function buildPortfolioSnapshot(
  portfolio: PortfolioState,
  stocks: Stock[]
): PortfolioSnapshot {
  const pricesByTicker = new Map(stocks.map((stock) => [stock.ticker, stock]));

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

  const investedAmount = holdings.reduce(
    (sum, holding) => sum + holding.costBasis,
    0
  );
  const marketValue = holdings.reduce(
    (sum, holding) => sum + holding.marketValue,
    0
  );
  const totalValue = portfolio.cashBalance + marketValue;
  const totalProfitLoss = marketValue - investedAmount;
  const totalProfitLossPercent =
    investedAmount > 0 ? (totalProfitLoss / investedAmount) * 100 : 0;

  return {
    cashBalance: portfolio.cashBalance,
    investedAmount,
    marketValue,
    totalValue,
    totalProfitLoss,
    totalProfitLossPercent,
    positionsCount: holdings.length,
    holdings: holdings.sort(
      (left, right) => right.marketValue - left.marketValue
    ),
  };
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolio, setPortfolio] = React.useState<PortfolioState>(
    defaultPortfolioState
  );
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    setPortfolio(
      parseStoredPortfolio(window.localStorage.getItem(STORAGE_KEY))
    );
    setHasLoaded(true);
  }, []);

  React.useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  }, [hasLoaded, portfolio]);

  const depositFunds = React.useCallback((amount: number, note?: string) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    setPortfolio((currentPortfolio) => ({
      ...currentPortfolio,
      cashBalance: currentPortfolio.cashBalance + amount,
      transactions: [
        {
          id: createTransactionId("deposit"),
          type: "deposit",
          amount,
          createdAt: new Date().toISOString(),
          note,
        },
        ...currentPortfolio.transactions,
      ],
    }));
  }, []);

  const value = React.useMemo(
    () => ({
      portfolio,
      depositFunds,
    }),
    [depositFunds, portfolio]
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
