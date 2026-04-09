import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { CurrencyRate } from "@/src/entities/market/api/get-currency-rates";
import type { Stock } from "@/src/entities/stock/model/types";
import { getSessionWithUser } from "@/src/lib/auth";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth-config";

export async function DashboardShell({
  currencyRates = [],
  children,
  stocks = [],
  title,
}: {
  currencyRates?: CurrencyRate[];
  children: React.ReactNode;
  stocks?: Stock[];
  title: string;
}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionId ? await getSessionWithUser(sessionId) : null;
  const user = {
    login: session?.user.login ?? "unknown",
    statusLabel: "Онлайн",
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        currencyRates={currencyRates}
        stocks={stocks}
        user={user}
      />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
