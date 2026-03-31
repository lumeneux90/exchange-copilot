import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getStocks } from "@/src/entities/stock/api/get-stocks"

function getMarketSummary(stocks: Awaited<ReturnType<typeof getStocks>>) {
  const gainers = stocks.filter((stock) => stock.changePercent > 0).length
  const losers = stocks.filter((stock) => stock.changePercent < 0).length
  const averagePrice =
    stocks.reduce((sum, stock) => sum + stock.price, 0) / (stocks.length || 1)
  const averageChangePercent =
    stocks.reduce((sum, stock) => sum + stock.changePercent, 0) /
    (stocks.length || 1)
  const topMover =
    stocks.reduce<(typeof stocks)[number] | null>((current, stock) => {
      if (!current) {
        return stock
      }

      return Math.abs(stock.changePercent) > Math.abs(current.changePercent)
        ? stock
        : current
    }, null) ?? stocks[0]

  return {
    averageChangePercent,
    averagePrice,
    gainers,
    losers,
    totalStocks: stocks.length,
    topMoverChangePercent: topMover?.changePercent ?? 0,
    topMoverLabel: topMover ? topMover.ticker : "n/a",
  }
}

export default async function HomePage() {
  const stocks = await getStocks()
  const summary = getMarketSummary(stocks)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <section id="market-overview">
                <SectionCards summary={summary} />
              </section>
              <section id="market-chart" className="px-4 lg:px-6">
                <ChartAreaInteractive stocks={stocks} />
              </section>
              <section id="stocks-table">
                <DataTable data={stocks} />
              </section>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
