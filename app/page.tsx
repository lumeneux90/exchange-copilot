import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { DashboardShell } from "@/components/dashboard-shell";
import { SectionCards } from "@/components/section-cards";
import { getCurrencyRates } from "@/src/entities/market/api/get-currency-rates";
import { getMoexIndex } from "@/src/entities/index/api/get-moex-index";
import { getStocks } from "@/src/entities/stock/api/get-stocks";

function getMarketSummary(
  stocks: Awaited<ReturnType<typeof getStocks>>,
  moexIndex: Awaited<ReturnType<typeof getMoexIndex>>
) {
  const gainers = stocks.filter((stock) => stock.changePercent > 0).length;
  const losers = stocks.filter((stock) => stock.changePercent < 0).length;
  const averageChangePercent =
    stocks.reduce((sum, stock) => sum + stock.changePercent, 0) /
    (stocks.length || 1);
  const strongestGainer =
    stocks.reduce<(typeof stocks)[number] | null>((current, stock) => {
      if (!current) {
        return stock;
      }

      return stock.changePercent > current.changePercent ? stock : current;
    }, null) ?? stocks[0];
  const strongestLoser =
    stocks.reduce<(typeof stocks)[number] | null>((current, stock) => {
      if (!current) {
        return stock;
      }

      return stock.changePercent < current.changePercent ? stock : current;
    }, null) ?? stocks[0];

  return {
    averageChangePercent,
    gainers,
    losers,
    moexIndexChangePercent: moexIndex?.changePercent ?? 0,
    moexIndexLabel: moexIndex?.shortName ?? "Индекс Мосбиржи",
    moexIndexValue: moexIndex?.currentValue ?? 0,
    totalStocks: stocks.length,
    strongestGainerChangePercent: strongestGainer?.changePercent ?? 0,
    strongestGainerLabel: strongestGainer ? strongestGainer.ticker : "n/a",
    strongestLoserChangePercent: strongestLoser?.changePercent ?? 0,
    strongestLoserLabel: strongestLoser ? strongestLoser.ticker : "n/a",
  };
}

export default async function HomePage() {
  const [stocks, currencyRates, moexIndex] = await Promise.all([
    getStocks(),
    getCurrencyRates(),
    getMoexIndex(),
  ]);
  const summary = getMarketSummary(stocks, moexIndex);

  return (
    <DashboardShell
      title="Обзор рынка"
      currencyRates={currencyRates}
      stocks={stocks}
    >
      <section id="market-overview">
        <SectionCards summary={summary} />
      </section>
      <section id="market-chart" className="px-4 lg:px-6">
        <ChartAreaInteractive stocks={stocks} />
      </section>
      <section id="stocks-table">
        <DataTable data={stocks} />
      </section>
    </DashboardShell>
  );
}
