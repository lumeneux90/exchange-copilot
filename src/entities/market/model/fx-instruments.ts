export type FxInstrument = {
  code: string;
  label: string;
  secid: string;
  cbrId: string;
};

export const FX_INSTRUMENTS: FxInstrument[] = [
  {
    code: "USD",
    label: "USD/RUB",
    secid: "USD000UTSTOM",
    cbrId: "R01235",
  },
  {
    code: "EUR",
    label: "EUR/RUB",
    secid: "EUR_RUB__TOM",
    cbrId: "R01239",
  },
  {
    code: "CNY",
    label: "CNY/RUB",
    secid: "CNYRUB_TOM",
    cbrId: "R01375",
  },
  {
    code: "GBP",
    label: "GBP/RUB",
    secid: "GBPRUB_TOM",
    cbrId: "R01035",
  },
  {
    code: "HKD",
    label: "HKD/RUB",
    secid: "HKDRUB_TOM",
    cbrId: "R01200",
  },
  {
    code: "AED",
    label: "AED/RUB",
    secid: "AEDRUB_TOM",
    cbrId: "R01230",
  },
];

export function getFxInstrumentByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  return FX_INSTRUMENTS.find((instrument) => instrument.code === normalizedCode);
}
