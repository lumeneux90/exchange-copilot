"use client";

import * as React from "react";
import { RiTimeLine } from "@remixicon/react";

import { AccountCardsCarousel } from "@/components/finance/account-cards-carousel";
import { OrderForm } from "@/components/finance/order-form";
import { OrdersTable } from "@/components/finance/orders-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceState } from "@/src/features/finance/model/types";

const HISTORY_PAGE_SIZE = 8;

export function FinanceWorkspace({ finance }: { finance: FinanceState }) {
  const [localFinance, setLocalFinance] = React.useState(finance);

  React.useEffect(() => {
    setLocalFinance(finance);
  }, [finance]);

  const accountCards = localFinance.accounts.filter((account) =>
    ["RUB", "USD", "XCP"].includes(account.asset)
  );
  const openOrders = localFinance.orders.filter(
    (order) => order.status === "OPEN"
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
          </CardHeader>
          <CardContent>
            <OrdersTable
              emptyTitle="Открытых заявок нет"
              onFinanceChange={setLocalFinance}
              orders={openOrders}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>История ордеров</CardTitle>
        </CardHeader>
        <CardContent>
          <OrdersTable
            emptyIcon={<RiTimeLine />}
            emptyTitle="История пуста"
            orders={localFinance.orders}
            pageSize={HISTORY_PAGE_SIZE}
            showActions={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
