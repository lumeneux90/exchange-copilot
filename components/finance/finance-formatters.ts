import type {
  FinanceAsset,
  FinancialOrderItem,
} from "@/src/features/finance/model/types";

const currencyFormatters = {
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
  USDT: new Intl.NumberFormat("ru-RU", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }),
  XCP: new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }),
  BTC: new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 8,
    minimumFractionDigits: 0,
  }),
  ETH: new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  }),
  BNB: new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }),
  SOL: new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }),
  DOGE: new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }),
  TON: new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }),
} satisfies Record<FinanceAsset, Intl.NumberFormat>;

const tokenAssets = new Set<string>([
  "USDT",
  "XCP",
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "DOGE",
  "TON",
]);

const fallbackFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 8,
  minimumFractionDigits: 0,
});

export function formatAssetAmount(
  amount: number,
  asset: FinanceAsset | string
) {
  const formatter =
    currencyFormatters[asset as FinanceAsset] ?? fallbackFormatter;

  if (tokenAssets.has(asset)) {
    return `${formatter.format(amount)} ${asset}`;
  }

  if (!currencyFormatters[asset as FinanceAsset]) {
    return `${formatter.format(amount)} ${asset}`;
  }

  return formatter.format(amount);
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
    case "PARTIALLY_FILLED":
      return "Частично";
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
    case "PARTIALLY_FILLED":
      return "secondary";
    case "ACCEPTED":
      return "default";
    case "CANCELLED":
      return "destructive";
  }
}

export function formatOrderId(id: string) {
  return id.slice(-6).toUpperCase();
}

export function formatOrderSide(side: FinancialOrderItem["side"]) {
  return side === "BUY" ? "Покупка" : "Продажа";
}
