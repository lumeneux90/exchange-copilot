import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrencyRates } from "@/src/entities/market/api/get-currency-rates";
import { getStocks } from "@/src/entities/stock/api/get-stocks";

export default async function ChartPage() {
  const [stocks, currencyRates] = await Promise.all([
    getStocks(),
    getCurrencyRates(),
  ]);

  return (
    <DashboardShell
      title="Терминал"
      currencyRates={currencyRates}
      stocks={stocks}
    >
      <section className="px-4 lg:px-6">
        <ChartAreaInteractive stocks={stocks} currencyRates={currencyRates} />
      </section>
    </DashboardShell>
  );
}
