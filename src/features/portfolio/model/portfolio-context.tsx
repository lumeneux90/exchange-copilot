"use client";

import * as React from "react";

import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import type { Stock } from "@/src/entities/stock/model/types";

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

export type PortfolioTransactionType =
  | "deposit"
  | "buy"
  | "sell"
  | "fx-buy"
  | "fx-sell";

export type PortfolioTransaction = {
  id: string;
  type: PortfolioTransactionType;
  amount: number;
  ticker?: string;
  currencyCode?: string;
  quantity?: number;
  price?: number;
  createdAt: string;
  note?: string;
};

type PortfolioState = {
  cashBalance: number;
  currencies: PortfolioCurrencyBalance[];
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
};

type PortfolioContextValue = {
  portfolio: PortfolioState;
  depositFunds: (amount: number, note?: string) => void;
  tradeCurrency: (params: {
    code: string;
    side: "buy" | "sell";
    amount: number;
    rate: number;
  }) => boolean;
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

const STORAGE_KEY = "xchange-copilot-portfolio";

const defaultPortfolioState: PortfolioState = {
  cashBalance: 187540,
  currencies: [
    { code: "USD", quantity: 320, averageRate: 91.4 },
    { code: "CNY", quantity: 1800, averageRate: 12.55 },
  ],
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
    {
      id: "seed-fx-buy-usd",
      type: "fx-buy",
      amount: 29248,
      currencyCode: "USD",
      quantity: 320,
      price: 91.4,
      createdAt: "2026-03-29T09:15:00.000Z",
    },
    {
      id: "seed-fx-buy-cny",
      type: "fx-buy",
      amount: 22590,
      currencyCode: "CNY",
      quantity: 1800,
      price: 12.55,
      createdAt: "2026-03-30T10:20:00.000Z",
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
      (parsed.currencies !== undefined && !Array.isArray(parsed.currencies)) ||
      !Array.isArray(parsed.holdings) ||
      !Array.isArray(parsed.transactions)
    ) {
      return defaultPortfolioState;
    }

    return {
      ...defaultPortfolioState,
      ...parsed,
      currencies: parsed.currencies ?? defaultPortfolioState.currencies,
    };
  } catch {
    return defaultPortfolioState;
  }
}

function createTransactionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

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
  const totalValue = portfolio.cashBalance + marketValue + currenciesMarketValue;
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

  const tradeCurrency = React.useCallback(
    ({
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
      if (!code || !Number.isFinite(amount) || amount <= 0 || rate <= 0) {
        return false;
      }

      let didApply = false;

      setPortfolio((currentPortfolio) => {
        const fxQuantity = side === "buy" ? amount / rate : amount;
        const rubAmount = side === "buy" ? amount : amount * rate;
        const existingBalance = currentPortfolio.currencies.find(
          (currency) => currency.code === code
        );
        const existingQuantity = existingBalance?.quantity ?? 0;

        if (
          side === "buy" &&
          currentPortfolio.cashBalance + Number.EPSILON < rubAmount
        ) {
          return currentPortfolio;
        }

        if (side === "sell" && existingQuantity + Number.EPSILON < fxQuantity) {
          return currentPortfolio;
        }

        didApply = true;

        const nextCurrencies =
          side === "buy"
            ? (() => {
                const nextQuantity = existingQuantity + fxQuantity;
                const nextAverageRate =
                  nextQuantity > 0
                    ? ((existingBalance?.averageRate ?? 0) * existingQuantity +
                        rubAmount) /
                      nextQuantity
                    : rate;

                if (existingBalance) {
                  return currentPortfolio.currencies.map((currency) =>
                    currency.code === code
                      ? {
                          ...currency,
                          quantity: nextQuantity,
                          averageRate: nextAverageRate,
                        }
                      : currency
                  );
                }

                return [
                  ...currentPortfolio.currencies,
                  {
                    code,
                    quantity: nextQuantity,
                    averageRate: nextAverageRate,
                  },
                ];
              })()
            : currentPortfolio.currencies
                .map((currency) =>
                  currency.code === code
                    ? {
                        ...currency,
                        quantity: Math.max(0, currency.quantity - fxQuantity),
                      }
                    : currency
                )
                .filter((currency) => currency.quantity > 0.000001);

        return {
          ...currentPortfolio,
          cashBalance:
            side === "buy"
              ? currentPortfolio.cashBalance - rubAmount
              : currentPortfolio.cashBalance + rubAmount,
          currencies: nextCurrencies,
          transactions: [
            {
              id: createTransactionId(side === "buy" ? "fx-buy" : "fx-sell"),
              type: side === "buy" ? "fx-buy" : "fx-sell",
              amount: rubAmount,
              currencyCode: code,
              quantity: fxQuantity,
              price: rate,
              createdAt: new Date().toISOString(),
            },
            ...currentPortfolio.transactions,
          ],
        };
      });

      return didApply;
    },
    []
  );

  const value = React.useMemo(
    () => ({
      portfolio,
      depositFunds,
      tradeCurrency,
    }),
    [depositFunds, portfolio, tradeCurrency]
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
