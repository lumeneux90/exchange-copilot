export type FinanceAsset = "RUB" | "USD" | "XCP";

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
};

export type FinancialOrderStatus = "OPEN" | "ACCEPTED" | "CANCELLED";

export type FinancialOrderItem = {
  acceptedAt: string | null;
  acceptedByLogin: string | null;
  amount: number;
  asset: FinanceAsset;
  createdAt: string;
  creatorLogin: string;
  id: string;
  relation: "own" | "available" | "accepted";
  status: FinancialOrderStatus;
};

export type FinanceState = {
  accounts: FinancialAccountItem[];
  currentUserLogin: string;
  orders: FinancialOrderItem[];
};

export function emptyFinanceState(): FinanceState {
  return {
    accounts: [],
    currentUserLogin: "",
    orders: [],
  };
}
