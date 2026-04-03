import { DashboardShell } from "@/components/dashboard-shell";
import { PortfolioOverview } from "@/components/portfolio/portfolio-overview";
import { getStocks } from "@/src/entities/stock/api/get-stocks";

export default async function PortfolioPage() {
  const stocks = await getStocks();

  return (
    <DashboardShell title="Портфель">
      <PortfolioOverview stocks={stocks} />
    </DashboardShell>
  );
}
