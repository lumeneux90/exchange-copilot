import { CurrencyFlag } from "@/components/currency-flag";
import { AssetIcon, isCryptoSpotAsset } from "@/components/finance/asset-icon";
import { formatAssetAmount } from "@/components/finance/finance-formatters";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { FinancialAccountItem } from "@/src/features/finance/model/types";

function SpotAssetRow({
  account,
  compact = false,
}: {
  account: FinancialAccountItem;
  compact?: boolean;
}) {
  const formattedBalance = formatAssetAmount(account.balance, account.asset);

  return (
    <Item variant="outline" size={compact ? "sm" : "default"}>
      <ItemMedia variant="image">
        {isCryptoSpotAsset(account.asset) ? (
          <AssetIcon asset={account.asset} className="size-full rounded-xl" />
        ) : (
          <CurrencyFlag
            code={account.asset}
            className="size-full rounded-xl"
            imageClassName="rounded-xl"
          />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{account.asset}</ItemTitle>
        <ItemDescription title={formattedBalance}>
          {formattedBalance}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

export function SpotAssetList({
  accounts,
  compact = false,
  description,
  title,
}: {
  accounts: FinancialAccountItem[];
  compact?: boolean;
  description?: string;
  title?: string;
}) {
  if (!accounts.length) {
    return null;
  }

  return (
    <section className="grid gap-2" data-size={compact ? "sm" : undefined}>
      {title ? (
        <div className="text-muted-foreground px-2 text-xs font-medium">
          {title}
          {description ? (
            <span className="sr-only">. {description}</span>
          ) : null}
        </div>
      ) : null}
      <ItemGroup>
        {accounts.map((account) => (
          <SpotAssetRow key={account.id} account={account} compact={compact} />
        ))}
      </ItemGroup>
    </section>
  );
}
