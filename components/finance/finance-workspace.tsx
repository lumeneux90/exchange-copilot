"use client";

import * as React from "react";
import { RiTimeLine } from "@remixicon/react";

import { AccountCardsCarousel } from "@/components/finance/account-cards-carousel";
import { OrderForm } from "@/components/finance/order-form";
import { OrdersTable } from "@/components/finance/orders-table";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  FinanceState,
  FinancialOrderItem,
} from "@/src/features/finance/model/types";

const HISTORY_PAGE_SIZE = 8;

type OrderOwnerFilter = "all" | "own" | "others";

const orderOwnerFilterLabels: Record<OrderOwnerFilter, string> = {
  all: "Все",
  own: "Свои",
  others: "Другие",
};

function filterOrdersByOwner(
  orders: FinancialOrderItem[],
  filter: OrderOwnerFilter
) {
  if (filter === "own") {
    return orders.filter((order) => order.relation === "own");
  }

  if (filter === "others") {
    return orders.filter((order) => order.relation !== "own");
  }

  return orders;
}

function OrderOwnerFilterToggle({
  value,
  onValueChange,
}: {
  value: OrderOwnerFilter;
  onValueChange: (value: OrderOwnerFilter) => void;
}) {
  return (
    <ToggleGroup
      multiple={false}
      value={[value]}
      onValueChange={(nextValue) => {
        const [selectedValue] = nextValue as OrderOwnerFilter[];

        if (selectedValue) {
          onValueChange(selectedValue);
        }
      }}
      variant="outline"
      size="sm"
    >
      {Object.entries(orderOwnerFilterLabels).map(([filter, label]) => (
        <ToggleGroupItem
          key={filter}
          value={filter}
          className="aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function FinanceWorkspace({ finance }: { finance: FinanceState }) {
  const [localFinance, setLocalFinance] = React.useState(finance);
  const [openOrdersFilter, setOpenOrdersFilter] =
    React.useState<OrderOwnerFilter>("all");
  const [historyOrdersFilter, setHistoryOrdersFilter] =
    React.useState<OrderOwnerFilter>("all");

  React.useEffect(() => {
    setLocalFinance(finance);
  }, [finance]);

  const accountCards = localFinance.accounts.filter((account) =>
    ["RUB", "USD", "XCP"].includes(account.asset)
  );
  const openOrders = localFinance.orders.filter(
    (order) => order.status === "OPEN"
  );
  const filteredOpenOrders = filterOrdersByOwner(openOrders, openOrdersFilter);
  const filteredHistoryOrders = filterOrdersByOwner(
    localFinance.orders,
    historyOrdersFilter
  );

  return (
    <div className="grid min-w-0 gap-4 px-4 lg:px-6">
      <section className="min-w-0">
        <AccountCardsCarousel accounts={accountCards} />
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(20rem,0.42fr)_minmax(0,1fr)]">
        <OrderForm onFinanceChange={setLocalFinance} />
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Открытые заявки</CardTitle>
            <CardAction>
              <OrderOwnerFilterToggle
                value={openOrdersFilter}
                onValueChange={setOpenOrdersFilter}
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <OrdersTable
              emptyTitle="Открытых заявок нет"
              onFinanceChange={setLocalFinance}
              orders={filteredOpenOrders}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>История ордеров</CardTitle>
          <CardAction>
            <OrderOwnerFilterToggle
              value={historyOrdersFilter}
              onValueChange={setHistoryOrdersFilter}
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          <OrdersTable
            emptyIcon={<RiTimeLine />}
            emptyTitle="История пуста"
            orders={filteredHistoryOrders}
            pageSize={HISTORY_PAGE_SIZE}
            showActions={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
