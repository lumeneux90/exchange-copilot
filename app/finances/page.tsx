import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { FinanceWorkspace } from "@/components/finance/finance-workspace";
import { getStocks } from "@/src/entities/stock/api/get-stocks";
import { getFinanceState } from "@/src/features/finance/model/finance-server";
import { getCurrentUser } from "@/src/lib/session";

export default async function FinancesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [stocks, finance] = await Promise.all([
    getStocks(),
    getFinanceState(user.id),
  ]);

  return (
    <DashboardShell title="Споты" stocks={stocks}>
      <FinanceWorkspace finance={finance} />
    </DashboardShell>
  );
}
