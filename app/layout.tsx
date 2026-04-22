import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaRegistration } from "@/src/features/pwa/ui/pwa-registration";
import { getCurrentUser } from "@/src/lib/session";

export const metadata: Metadata = {
  title: "Xchange Copilot",
  description: "Данные по акциям, валютам и портфелю в формате PWA-приложения",
  applicationName: "Xchange Copilot",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Xchange Copilot",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0d7a43",
  colorScheme: "light dark",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const user = await getCurrentUser();

  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className="font-sans"
      style={{ "--font-sans": "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" } as React.CSSProperties}
    >
      <body suppressHydrationWarning>
        <PwaRegistration />
        <Providers currentUser={user}>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
