import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { FinanceWorkspace } from "@/components/finance/finance-workspace";
import { getCurrencyRates } from "@/src/entities/market/api/get-currency-rates";
import { getStocks } from "@/src/entities/stock/api/get-stocks";
import { getFinanceState } from "@/src/features/finance/model/finance-server";
import { getCurrentUser } from "@/src/lib/session";

export default async function FinancesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [stocks, currencyRates, finance] = await Promise.all([
    getStocks(),
    getCurrencyRates(),
    getFinanceState(user.id),
  ]);

  return (
    <DashboardShell
      title="Споты"
      currencyRates={currencyRates}
      stocks={stocks}
    >
      <FinanceWorkspace finance={finance} />
    </DashboardShell>
  );
}
