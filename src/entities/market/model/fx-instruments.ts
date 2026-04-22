import { ACTIVE_FX_CURRENCY_CODES } from "@/src/entities/market/model/currencies";

export type FxInstrument = {
  code: string;
  label: string;
  secid: string;
  cbrId: string;
};

const ALL_FX_INSTRUMENTS: FxInstrument[] = [
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
    code: "HKD",
    label: "HKD/RUB",
    secid: "HKDRUB_TOM",
    cbrId: "R01200",
  },
];

export const FX_INSTRUMENTS: FxInstrument[] = ALL_FX_INSTRUMENTS.filter(
  (instrument) => ACTIVE_FX_CURRENCY_CODES.includes(instrument.code as (typeof ACTIVE_FX_CURRENCY_CODES)[number])
);

export function getFxInstrumentByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  return FX_INSTRUMENTS.find((instrument) => instrument.code === normalizedCode);
}
