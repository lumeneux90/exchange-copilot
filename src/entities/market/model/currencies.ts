export const ACTIVE_FX_CURRENCY_CODES = ["USD", "EUR", "CNY"] as const;

const currencyLabelMap: Record<string, string> = {
  USD: "Доллар США",
  EUR: "Евро",
  CNY: "Китайский юань",
};

const activeFxCurrencyCodeSet = new Set<string>(ACTIVE_FX_CURRENCY_CODES);

export function isActiveFxCurrencyCode(code: string) {
  return activeFxCurrencyCodeSet.has(code.trim().toUpperCase());
}

export function getCurrencyLabel(code: string) {
  return (
    currencyLabelMap[code.trim().toUpperCase()] ?? code.trim().toUpperCase()
  );
}
