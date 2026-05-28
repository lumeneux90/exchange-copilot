export type FinanceAsset =
  | "RUB"
  | "USD"
  | "USDT"
  | "XCP"
  | "BTC"
  | "ETH"
  | "BNB"
  | "SOL"
  | "DOGE"
  | "TON";

export type FinancialMarketPairItem = {
  amountPrecision: number;
  baseAsset: FinanceAsset;
  id: string;
  label: string;
  pricePrecision: number;
  quoteAsset: FinanceAsset;
  symbol: string;
};

export type FinancialCardDetails = {
  cvvLabel: string;
  holderName: string;
  issuer: string;
  maskedNumber: string;
  validThru: string;
};

export type FinancialAccountItem = {
  asset: FinanceAsset;
  balance: number;
  card: FinancialCardDetails;
  displayNumber: string;
  id: string;
  lockedBalance: number;
};

export type FinancialOrderSide = "BUY" | "SELL";

export type FinancialOrderStatus =
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "ACCEPTED"
  | "CANCELLED";

export type FinancialOrderItem = {
  acceptedAt: string | null;
  acceptedByLogin: string | null;
  amount: number;
  asset: FinanceAsset;
  createdAt: string;
  creatorLogin: string;
  filledAmount: number;
  id: string;
  pairId: string | null;
  price: number;
  quoteAsset: FinanceAsset;
  relation: "own" | "available" | "accepted";
  side: FinancialOrderSide;
  status: FinancialOrderStatus;
};

export type FinancialTradeItem = {
  amount: number;
  asset: FinanceAsset;
  executedAt: string;
  id: string;
  pairId: string | null;
  price: number;
  quoteAmount: number;
  quoteAsset: FinanceAsset;
  side: "buy" | "sell";
};

export type FinanceState = {
  accounts: FinancialAccountItem[];
  currentUserLogin: string;
  marketPairs: FinancialMarketPairItem[];
  orders: FinancialOrderItem[];
  selectedPairSymbol: string;
  trades: FinancialTradeItem[];
};

export type FinancePairState = Pick<
  FinanceState,
  "orders" | "selectedPairSymbol" | "trades"
>;

export function emptyFinanceState(): FinanceState {
  return {
    accounts: [],
    currentUserLogin: "",
    marketPairs: [],
    orders: [],
    selectedPairSymbol: "USD/RUB",
    trades: [],
  };
}
