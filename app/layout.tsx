import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPortfolioState } from "@/src/features/portfolio/model/portfolio-server";
import { getCurrentUser } from "@/src/lib/session";

export const metadata: Metadata = {
  title: "Xchange Copilot",
  description: "Данные по акциям с торгов",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const user = await getCurrentUser();
  const initialPortfolio = user ? await getPortfolioState(user.id) : null;

  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className="font-sans"
      style={{ "--font-sans": "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" } as React.CSSProperties}
    >
      <body suppressHydrationWarning>
        <Providers initialPortfolio={initialPortfolio}>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
