import type {
  FinanceAsset,
  FinancialOrderItem,
} from "@/src/features/finance/model/types";

const currencyFormatters: Record<FinanceAsset, Intl.NumberFormat> = {
  RUB: new Intl.NumberFormat("ru-RU", {
    currency: "RUB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }),
  USD: new Intl.NumberFormat("ru-RU", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }),
  XCP: new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }),
};

export function formatAssetAmount(amount: number, asset: FinanceAsset) {
  if (asset === "XCP") {
    return `${currencyFormatters.XCP.format(amount)} XCP`;
  }

  return currencyFormatters[asset].format(amount);
}

export function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function getStatusLabel(status: FinancialOrderItem["status"]) {
  switch (status) {
    case "OPEN":
      return "Открыт";
    case "ACCEPTED":
      return "Исполнен";
    case "CANCELLED":
      return "Отменен";
  }
}

export function getStatusBadgeVariant(status: FinancialOrderItem["status"]) {
  switch (status) {
    case "OPEN":
      return "outline";
    case "ACCEPTED":
      return "default";
    case "CANCELLED":
      return "destructive";
  }
}

export function formatOrderId(id: string) {
  return id.slice(-6).toUpperCase();
}
