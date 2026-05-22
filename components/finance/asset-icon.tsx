import { RiMoneyDollarCircleFill, RiTokenSwapFill } from "@remixicon/react";

import type { FinanceAsset } from "@/src/features/finance/model/types";
import { cn } from "@/src/lib/utils";

const cryptoAssetSymbols = new Set<FinanceAsset>([
  "USDT",
  "XCP",
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "DOGE",
  "TON",
]);

export function isCryptoSpotAsset(asset: FinanceAsset) {
  return cryptoAssetSymbols.has(asset);
}

const cryptoLogoUrls: Partial<Record<FinanceAsset, string>> = {
  BNB: "https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=040",
  BTC: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=040",
  DOGE: "https://cryptologos.cc/logos/dogecoin-doge-logo.svg?v=040",
  ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=040",
  SOL: "https://cryptologos.cc/logos/solana-sol-logo.svg?v=040",
  TON: "https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040",
  USDT: "https://cryptologos.cc/logos/tether-usdt-logo.svg?v=040",
};

function getAssetIconTheme(asset: FinanceAsset) {
  switch (asset) {
    case "RUB":
      return "bg-teal-500/15 text-teal-600 dark:text-teal-300";
    case "USD":
      return "bg-lime-500/15 text-lime-700 dark:text-lime-300";
    case "USDT":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
    case "XCP":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-300";
    case "BTC":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-300";
    case "ETH":
      return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300";
    case "BNB":
      return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300";
    case "SOL":
      return "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300";
    case "DOGE":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "TON":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-300";
  }
}

export function AssetIcon({
  asset,
  className,
}: {
  asset: FinanceAsset;
  className?: string;
}) {
  const logoUrl = cryptoLogoUrls[asset];

  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full",
        getAssetIconTheme(asset),
        className
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Small remote SVG logos render better as plain decorative images.
        <img src={logoUrl} alt="" className="size-5" loading="lazy" />
      ) : asset === "XCP" ? (
        <RiTokenSwapFill className="size-4" />
      ) : asset === "USD" || asset === "RUB" ? (
        <RiMoneyDollarCircleFill className="size-4" />
      ) : (
        <span className="text-[0.65rem] font-bold tracking-normal">
          {asset.slice(0, 2)}
        </span>
      )}
    </span>
  );
}
