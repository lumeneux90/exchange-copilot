import { DashboardShell } from "@/components/dashboard-shell";
import { HistoryTable } from "@/components/portfolio/history-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getPortfolioHistory } from "@/src/features/portfolio/model/portfolio-server";
import { getCurrencyRates } from "@/src/entities/market/api/get-currency-rates";
import { getStocks } from "@/src/entities/stock/api/get-stocks";
import { getCurrentUser } from "@/src/lib/session";
import { RiTimeLine } from "@remixicon/react";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const [stocks, currencyRates, historyItems] = await Promise.all([
    getStocks(),
    getCurrencyRates(),
    user ? getPortfolioHistory(user.id) : Promise.resolve([]),
  ]);

  return (
    <DashboardShell title="История" currencyRates={currencyRates} stocks={stocks}>
      <section className="px-4 lg:px-6">
        {historyItems.length > 0 ? (
          <HistoryTable items={historyItems} stocks={stocks} />
        ) : (
          <Empty className="min-h-[24rem] border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiTimeLine />
              </EmptyMedia>
              <EmptyTitle>История операций пока пуста</EmptyTitle>
              <EmptyDescription>
                После пополнения счета, покупки или продажи бумаги операции
                появятся здесь в хронологическом порядке.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </DashboardShell>
  );
}
