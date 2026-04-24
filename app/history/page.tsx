import { DashboardShell } from "@/components/dashboard-shell";
import { HistoryTable } from "@/components/portfolio/history-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getPortfolioHistoryPage } from "@/src/features/portfolio/model/portfolio-server";
import type { PortfolioHistoryPage } from "@/src/features/portfolio/model/history";
import { getCurrencyRates } from "@/src/entities/market/api/get-currency-rates";
import { getStocks } from "@/src/entities/stock/api/get-stocks";
import { getCurrentUser } from "@/src/lib/session";
import { RiTimeLine } from "@remixicon/react";

const HISTORY_PAGE_SIZE = 25;

type HistoryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPageParam(value: string | string[] | undefined) {
  const page = Number(getSearchParamValue(value));

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function emptyHistoryPage(pageSize: number): PortfolioHistoryPage {
  return {
    currentPage: 1,
    items: [],
    pageSize,
    totalItems: 0,
    totalPages: 1,
  };
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = getPageParam(resolvedSearchParams?.page);
  const user = await getCurrentUser();
  const [stocks, currencyRates, historyPage] = await Promise.all([
    getStocks(),
    getCurrencyRates(),
    user
      ? getPortfolioHistoryPage(user.id, {
          page,
          pageSize: HISTORY_PAGE_SIZE,
        })
      : Promise.resolve(emptyHistoryPage(HISTORY_PAGE_SIZE)),
  ]);

  return (
    <DashboardShell title="История" currencyRates={currencyRates} stocks={stocks}>
      <section className="px-4 lg:px-6">
        {historyPage.totalItems > 0 ? (
          <HistoryTable
            items={historyPage.items}
            pagination={{
              currentPage: historyPage.currentPage,
              pageSize: historyPage.pageSize,
              totalItems: historyPage.totalItems,
              totalPages: historyPage.totalPages,
            }}
            stocks={stocks}
          />
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
