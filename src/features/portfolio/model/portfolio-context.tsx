"use client";

import * as React from "react";

import type { Stock } from "@/src/entities/stock/model/types";
import {
  depositFundsAction,
  getPortfolioStateAction,
  tradeStockAction,
  withdrawFundsAction,
} from "@/src/features/portfolio/model/actions";
import { notifyFinanceRefresh } from "@/src/features/finance/model/finance-context";
import {
  emptyPortfolioState,
  type PortfolioHolding,
  type PortfolioState,
  type PortfolioTransferCurrency,
} from "@/src/features/portfolio/model/types";

type PortfolioContextValue = {
  portfolio: PortfolioState;
  isPending: boolean;
  refreshPortfolio: () => Promise<void>;
  depositFunds: (
    amount: number,
    currency?: PortfolioTransferCurrency
  ) => Promise<void>;
  withdrawFunds: (
    amount: number,
    currency?: PortfolioTransferCurrency
  ) => Promise<void>;
  tradeStock: (params: {
    ticker: string;
    side: "buy" | "sell";
    quantity: number;
    quotedPrice: number;
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
  usdCashBalance: number;
  usdMarketValue: number;
  investedAmount: number;
  marketValue: number;
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  positionsCount: number;
  holdings: PortfolioHoldingSnapshot[];
};

const PortfolioContext = React.createContext<PortfolioContextValue | null>(
  null
);

export function buildPortfolioSnapshot(
  portfolio: PortfolioState,
  stocks: Stock[],
  usdRubRate = 0
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
  const usdMarketValue = portfolio.usdCashBalance * usdRubRate;
  const totalValue = portfolio.cashBalance + marketValue + usdMarketValue;
  const totalProfitLoss = marketValue - investedAmount;
  const totalProfitLossPercent =
    investedAmount > 0 ? (totalProfitLoss / investedAmount) * 100 : 0;

  return {
    cashBalance: portfolio.cashBalance,
    usdCashBalance: portfolio.usdCashBalance,
    usdMarketValue,
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

export function PortfolioProvider({
  children,
  currentUser,
  initialPortfolio,
}: {
  children: React.ReactNode;
  currentUser: {
    id: string;
    login: string;
  } | null;
  initialPortfolio?: PortfolioState | null;
}) {
  const [portfolio, setPortfolio] = React.useState<PortfolioState>(
    initialPortfolio ?? emptyPortfolioState()
  );
  const [isPending, setIsPending] = React.useState(false);
  const loadedPortfolioUserIdRef = React.useRef<string | null>(
    initialPortfolio ? (currentUser?.id ?? null) : null
  );

  const refreshPortfolio = React.useCallback(async () => {
    setIsPending(true);

    try {
      const nextPortfolio = await getPortfolioStateAction();
      setPortfolio(nextPortfolio);
    } finally {
      setIsPending(false);
    }
  }, []);

  const depositFunds = React.useCallback(
    async (amount: number, currency: PortfolioTransferCurrency = "RUB") => {
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Введите корректную сумму пополнения.");
      }

      setIsPending(true);

      try {
        const result = await depositFundsAction(amount, currency);

        if (!result.ok) {
          throw new Error(result.error);
        }

        setPortfolio(result.portfolio);
        notifyFinanceRefresh();
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  const withdrawFunds = React.useCallback(
    async (amount: number, currency: PortfolioTransferCurrency = "RUB") => {
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Введите корректную сумму вывода.");
      }

      setIsPending(true);

      try {
        const result = await withdrawFundsAction(amount, currency);

        if (!result.ok) {
          throw new Error(result.error);
        }

        setPortfolio(result.portfolio);
        notifyFinanceRefresh();
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  const tradeStock = React.useCallback(
    async ({
      quotedPrice,
      quantity,
      side,
      ticker,
    }: {
      ticker: string;
      side: "buy" | "sell";
      quantity: number;
      quotedPrice: number;
    }) => {
      if (
        !ticker ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(quantity) ||
        !Number.isFinite(quotedPrice) ||
        quotedPrice <= 0
      ) {
        throw new Error("Некорректные параметры сделки по акции.");
      }

      setIsPending(true);

      try {
        const result = await tradeStockAction({
          quotedPrice,
          quantity,
          side,
          ticker,
        });

        if (!result.ok) {
          throw new Error(result.error);
        }

        setPortfolio(result.portfolio);
        notifyFinanceRefresh();
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
      tradeStock,
      withdrawFunds,
    }),
    [
      depositFunds,
      isPending,
      portfolio,
      refreshPortfolio,
      tradeStock,
      withdrawFunds,
    ]
  );

  React.useEffect(() => {
    if (initialPortfolio) {
      setPortfolio(initialPortfolio);
      loadedPortfolioUserIdRef.current = currentUser?.id ?? null;
      return;
    }

    if (!currentUser) {
      setPortfolio(emptyPortfolioState());
      loadedPortfolioUserIdRef.current = null;
      return;
    }

    if (loadedPortfolioUserIdRef.current === currentUser.id) {
      return;
    }

    loadedPortfolioUserIdRef.current = currentUser.id;
    void refreshPortfolio();
  }, [currentUser, initialPortfolio, refreshPortfolio]);

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
