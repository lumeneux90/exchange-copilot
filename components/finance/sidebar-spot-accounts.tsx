"use client";

import { isCryptoSpotAsset } from "@/components/finance/asset-icon";
import { SpotAssetList } from "@/components/finance/spot-asset-list";
import type { FinancialAccountItem } from "@/src/features/finance/model/types";

export function SidebarSpotAccounts({
  accounts,
}: {
  accounts: FinancialAccountItem[];
}) {
  const fiatAccounts = accounts.filter(
    (account) => !isCryptoSpotAsset(account.asset)
  );
  const spotAccounts = accounts.filter((account) =>
    isCryptoSpotAsset(account.asset)
  );

  return (
    <div className="mt-3 grid gap-2 px-2">
      <SpotAssetList accounts={fiatAccounts} compact title="Валюта" />
      <SpotAssetList accounts={spotAccounts} compact title="Спот-активы" />
    </div>
  );
}
