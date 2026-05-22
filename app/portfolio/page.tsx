import { DashboardShell } from "@/components/dashboard-shell";
import { PortfolioOverview } from "@/components/portfolio/portfolio-overview";
import { getUsdRubReferenceRate } from "@/src/features/finance/model/finance-server";
import { getStocks } from "@/src/entities/stock/api/get-stocks";

export default async function PortfolioPage() {
  const [stocks, usdRubRate] = await Promise.all([
    getStocks(),
    getUsdRubReferenceRate(),
  ]);

  return (
    <DashboardShell title="Портфель" stocks={stocks} usdRubRate={usdRubRate}>
      <PortfolioOverview stocks={stocks} usdRubRate={usdRubRate} />
    </DashboardShell>
  );
}
