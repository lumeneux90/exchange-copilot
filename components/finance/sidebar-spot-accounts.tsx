"use client";

import { formatAssetAmount } from "@/components/finance/finance-formatters";
import { Badge } from "@/components/ui/badge";
import type {
  FinanceAsset,
  FinancialAccountItem,
} from "@/src/features/finance/model/types";
import { cn } from "@/src/lib/utils";

function getAccountTitle(asset: FinanceAsset) {
  switch (asset) {
    case "RUB":
      return "Рубли";
    case "USD":
      return "Доллары";
    case "EUR":
      return "Евро";
    case "CNY":
      return "Юани";
    case "XCP":
      return "Токены";
  }
}

function getAccountTheme(asset: FinanceAsset) {
  switch (asset) {
    case "RUB":
      return "border-teal-300/35 bg-[linear-gradient(135deg,#042f2e_0%,#0f766e_48%,#2dd4bf_145%)]";
    case "USD":
      return "border-lime-200/35 bg-[linear-gradient(135deg,#14230f_0%,#4d7c0f_50%,#bef264_145%)]";
    case "EUR":
      return "border-sky-300/35 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#7dd3fc_145%)]";
    case "CNY":
      return "border-red-300/35 bg-[linear-gradient(135deg,#3f0a0a_0%,#b91c1c_48%,#fde047_145%)]";
    case "XCP":
      return "border-violet-300/35 bg-[linear-gradient(135deg,#18181b_0%,#6d28d9_52%,#34d399_145%)]";
  }
}

function SidebarSpotAccount({ account }: { account: FinancialAccountItem }) {
  return (
    <div
      className={cn(
        "relative isolate grid gap-2 overflow-hidden rounded-lg border p-3 text-white shadow-sm",
        getAccountTheme(account.asset)
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.28),rgba(255,255,255,0)_38%),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:100%_100%,24px_24px] opacity-30" />
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {getAccountTitle(account.asset)}
          </div>
        </div>
        <Badge variant="outline">{account.asset}</Badge>
      </div>

      <div className="grid gap-1">
        <div className="text-lg font-semibold tabular-nums">
          {formatAssetAmount(account.balance, account.asset)}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-[0.68rem] font-semibold text-white/75">
        <div className="min-w-0">
          <div className="text-white/50 uppercase">CARD HOLDER</div>
          <div className="truncate font-mono">{account.card.holderName}</div>
        </div>
        <div className="text-right">
          <div className="text-white/50 uppercase">До</div>
          <div className="font-mono">{account.card.validThru}</div>
        </div>
      </div>
    </div>
  );
}

export function SidebarSpotAccounts({
  accounts,
}: {
  accounts: FinancialAccountItem[];
}) {
  return (
    <div className="mt-3 grid gap-2 px-2">
      <div className="text-muted-foreground px-2 text-xs font-medium">
        Спот-счета
      </div>
      <div className="grid gap-2">
        {accounts.map((account) => (
          <SidebarSpotAccount key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
