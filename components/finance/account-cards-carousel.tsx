import { AccountCard } from "@/components/finance/account-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { FinancialAccountItem } from "@/src/features/finance/model/types";

export function AccountCardsCarousel({
  accounts,
}: {
  accounts: FinancialAccountItem[];
}) {
  return (
    <Carousel opts={{ align: "start" }} className="min-w-0">
      <CarouselContent className="-ml-3">
        {accounts.map((account) => (
          <CarouselItem
            key={account.id}
            className="basis-full pl-3 sm:basis-1/2 xl:basis-1/3"
          >
            <AccountCard account={account} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="mt-2 flex justify-end gap-2">
        <CarouselPrevious className="static translate-none" />
        <CarouselNext className="static translate-none" />
      </div>
    </Carousel>
  );
}
