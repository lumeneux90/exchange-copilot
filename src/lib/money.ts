export const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseDecimalInput(value: string) {
  const normalized = value.replace(",", ".").replace(/\s+/g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : 0;
}

export function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

export function formatSignedCurrency(
  value: number,
  formatter: Intl.NumberFormat = rubFormatter
) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${formatter.format(value)}`;
}
