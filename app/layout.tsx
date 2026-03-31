import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Xchange Copilot",
  description: "Данные по акциям с торгов",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ru"
      className="font-sans"
      style={{ "--font-sans": "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" } as React.CSSProperties}
    >
      <body>
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
