import { DataTable } from "@/components/data-table";
import { DashboardShell } from "@/components/dashboard-shell";
import { SectionCards } from "@/components/section-cards";
import { getUsdRubReferenceRate } from "@/src/features/finance/model/finance-server";
import { getMoexIndex } from "@/src/entities/index/api/get-moex-index";
import { getStocks } from "@/src/entities/stock/api/get-stocks";
import { getPortfolioLeaderboard } from "@/src/features/portfolio/model/portfolio-server";

function getMarketSummary(
  stocks: Awaited<ReturnType<typeof getStocks>>,
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
    moexIndexChangePercent: moexIndex?.changePercent ?? 0,
    moexIndexLabel: moexIndex?.shortName ?? "Индекс Мосбиржи",
    moexIndexValue: moexIndex?.currentValue ?? 0,
    mostActiveStocks,
    topGainers,
    topLosers,
  };
}

export default async function HomePage() {
  const [stocks, moexIndex, usdRubRate] = await Promise.all([
    getStocks(),
    getMoexIndex(),
    getUsdRubReferenceRate(),
  ]);
  const leaderboard = await getPortfolioLeaderboard(stocks, usdRubRate);
  const summary = getMarketSummary(stocks, moexIndex);

  return (
    <DashboardShell
      title="Обзор рынка"
      usdRubRate={usdRubRate}
      stocks={stocks}
    >
      <section id="market-overview">
        <SectionCards leaderboard={leaderboard} summary={summary} />
      </section>
      <section id="stocks-table">
        <DataTable data={stocks} />
      </section>
    </DashboardShell>
  );
}
