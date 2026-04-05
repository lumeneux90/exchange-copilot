import { DashboardShell } from "@/components/dashboard-shell";
import { PortfolioOverview } from "@/components/portfolio/portfolio-overview";
import { getCurrencyRates } from "@/src/entities/market/api/get-currency-rates";
import { getStocks } from "@/src/entities/stock/api/get-stocks";

export default async function PortfolioPage() {
  const [stocks, currencyRates] = await Promise.all([
    getStocks(),
    getCurrencyRates(),
  ]);

  return (
    <DashboardShell title="Портфель" currencyRates={currencyRates} stocks={stocks}>
      <PortfolioOverview currencyRates={currencyRates} stocks={stocks} />
    </DashboardShell>
  );
}
