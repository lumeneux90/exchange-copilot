import { DataTable } from "@/components/data-table";
import { DashboardShell } from "@/components/dashboard-shell";
import { SectionCards } from "@/components/section-cards";
import { getCurrencyRates } from "@/src/entities/market/api/get-currency-rates";
import { getMoexIndex } from "@/src/entities/index/api/get-moex-index";
import { getStocks } from "@/src/entities/stock/api/get-stocks";

function getMarketSummary(
  stocks: Awaited<ReturnType<typeof getStocks>>,
  currencyRates: Awaited<ReturnType<typeof getCurrencyRates>>,
  moexIndex: Awaited<ReturnType<typeof getMoexIndex>>
) {
  const mostActiveStocks = [...stocks]
    .sort((left, right) => right.tradedValue - left.tradedValue)
    .slice(0, 5);
  const topGainers = [...stocks]
    .filter((stock) => stock.changePercent > 0)
    .sort((left, right) => right.changePercent - left.changePercent)
    .slice(0, 5);
  const topLosers = [...stocks]
    .filter((stock) => stock.changePercent < 0)
    .sort((left, right) => left.changePercent - right.changePercent)
    .slice(0, 5);

  return {
    currencyRates,
    moexIndexChangePercent: moexIndex?.changePercent ?? 0,
    moexIndexLabel: moexIndex?.shortName ?? "Индекс Мосбиржи",
    moexIndexValue: moexIndex?.currentValue ?? 0,
    mostActiveStocks,
    topGainers,
    topLosers,
  };
}

export default async function HomePage() {
  const [stocks, currencyRates, moexIndex] = await Promise.all([
    getStocks(),
    getCurrencyRates(),
    getMoexIndex(),
  ]);
  const summary = getMarketSummary(stocks, currencyRates, moexIndex);

  return (
    <DashboardShell
      title="Обзор рынка"
      currencyRates={currencyRates}
      stocks={stocks}
    >
      <section id="market-overview">
        <SectionCards summary={summary} />
      </section>
      <section id="stocks-table">
        <DataTable data={stocks} />
      </section>
    </DashboardShell>
  );
}
