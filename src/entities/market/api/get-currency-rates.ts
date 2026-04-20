export type CurrencyRate = {
  code: string;
  label: string;
  price: number;
  openingPrice: number;
  change: number;
  changePercent: number;
};

type CbrDailyCurrency = {
  CharCode?: string;
  Nominal?: number;
  Value?: number;
  Previous?: number;
};

type CbrDailyResponse = {
  Valute?: Record<string, CbrDailyCurrency>;
};

const CBR_DAILY_JSON_URL = "https://www.cbr-xml-daily.ru/daily_json.js";
const TARGET_CURRENCIES = ["USD", "EUR", "CNY", "GBP", "HKD", "AED"] as const;

function getRubPrice(currency: CbrDailyCurrency | undefined) {
  const nominal = currency?.Nominal ?? 0;
  const value = currency?.Value ?? 0;

  if (!Number.isFinite(nominal) || nominal <= 0) {
    return 0;
  }

  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value / nominal;
}

function getPreviousRubPrice(currency: CbrDailyCurrency | undefined) {
  const nominal = currency?.Nominal ?? 0;
  const previous = currency?.Previous ?? 0;

  if (!Number.isFinite(nominal) || nominal <= 0) {
    return 0;
  }

  if (!Number.isFinite(previous) || previous <= 0) {
    return 0;
  }

  return previous / nominal;
}

export async function getCurrencyRates(): Promise<CurrencyRate[]> {
  try {
    const response = await fetch(CBR_DAILY_JSON_URL, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as CbrDailyResponse;
    const currencies = data.Valute ?? {};

    return TARGET_CURRENCIES.map((currencyCode) => {
      const currency = currencies[currencyCode];
      const price = getRubPrice(currency);
      const openingPrice = getPreviousRubPrice(currency) || price;
      const change = price - openingPrice;
      const changePercent =
        openingPrice > 0 ? (change / openingPrice) * 100 : 0;

      return {
        code: currencyCode,
        label: `${currencyCode}/RUB`,
        price,
        openingPrice,
        change,
        changePercent: Number.isFinite(changePercent) ? changePercent : 0,
      };
    }).filter((pair) => pair.price > 0 && pair.openingPrice > 0);
  } catch {
    return [];
  }
}
