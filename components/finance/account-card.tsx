import { Badge } from "@/components/ui/badge";
import { formatAssetAmount } from "@/components/finance/finance-formatters";
import type {
  FinanceAsset,
  FinancialAccountItem,
} from "@/src/features/finance/model/types";
import { cn } from "@/src/lib/utils";

function getAccountTitle(asset: FinanceAsset) {
  switch (asset) {
    case "RUB":
      return "Рублевая карта";
    case "USD":
      return "Валютная карта";
    case "XCP":
      return "Токен-карта";
  }
}

function getAccountCardTheme(asset: FinanceAsset) {
  switch (asset) {
    case "RUB":
      return "border-sidebar-primary/35 bg-[linear-gradient(135deg,#07131f_0%,color-mix(in_oklab,var(--primary)_58%,#123246)_55%,color-mix(in_oklab,var(--chart-3)_24%,#4f5965)_132%)] text-white";
    case "USD":
      return "border-orange-200/30 bg-[linear-gradient(135deg,#4a2f2a_0%,#9a5f42_52%,#d2b58c_132%)] text-white";
    case "XCP":
      return "border-violet-200/35 bg-[linear-gradient(135deg,#18181b_0%,#7c3aed_55%,#22c55e_135%)] text-white";
  }
}

export function AccountCard({ account }: { account: FinancialAccountItem }) {
  return (
    <div
      className={cn(
        "relative isolate flex h-52 w-full overflow-hidden rounded-lg border p-5 shadow-sm",
        getAccountCardTheme(account.asset)
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(115deg,rgba(255,255,255,.28),rgba(255,255,255,0)_34%),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:100%_100%,28px_28px] opacity-25" />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-medium text-white/70">
              {account.card.issuer}
            </div>
            <div className="mt-0.5 text-lg font-semibold sm:text-xl">
              {getAccountTitle(account.asset)}
            </div>
          </div>
          <Badge className="border-white/25 bg-white/15 text-white hover:bg-white/15">
            {account.asset}
          </Badge>
        </div>

        <div className="flex min-w-0 items-center gap-4">
          <div className="relative grid h-9 w-12 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/35 bg-[linear-gradient(135deg,#f3d98c_0%,#9f8653_52%,#f8e6a8_100%)] p-1.5 shadow-sm ring-1 ring-black/10 sm:h-10 sm:w-14">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.5),transparent_34%),linear-gradient(90deg,rgba(76,55,24,.28)_1px,transparent_1px),linear-gradient(0deg,rgba(76,55,24,.24)_1px,transparent_1px)] [background-size:100%_100%,14px_14px,14px_14px]" />
            <span className="relative rounded-sm border border-amber-950/20 bg-amber-100/45" />
            <span className="relative rounded-sm border border-amber-950/20 bg-yellow-200/30" />
            <span className="relative rounded-sm border border-amber-950/20 bg-yellow-200/25" />
            <span className="relative rounded-sm border border-amber-950/20 bg-amber-100/40" />
          </div>
          <div className="min-w-0 truncate font-mono text-base font-medium tracking-normal text-white sm:text-lg">
            {account.card.maskedNumber}
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-4">
          <div className="min-w-0">
            <div className="text-xs font-medium text-white/65 uppercase">
              Баланс
            </div>
            <div className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl">
              {formatAssetAmount(account.balance, account.asset)}
            </div>
            <div className="mt-1 truncate font-mono text-xs font-semibold text-white/75 uppercase">
              {account.card.holderName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-white/65 uppercase">
              До
            </div>
            <div className="mt-1 font-mono text-sm font-semibold">
              {account.card.validThru}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-white/65 uppercase">
              CVV
            </div>
            <div className="mt-1 font-mono text-sm font-semibold">
              {account.card.cvvLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
