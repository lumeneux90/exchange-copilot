import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DashboardShell } from "@/components/dashboard-shell";
import { getStocks } from "@/src/entities/stock/api/get-stocks";

export default async function ChartPage() {
  const stocks = await getStocks();

  return (
    <DashboardShell title="Терминал" stocks={stocks}>
      <section className="px-4 lg:px-6">
        <ChartAreaInteractive stocks={stocks} />
      </section>
    </DashboardShell>
  );
}
