"use client";

import Link from "next/link";
import { RiArrowRightUpLine } from "@remixicon/react";

import { DepositFundsSheet } from "@/components/deposit-funds-sheet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  buildPortfolioSnapshot,
  usePortfolio,
} from "@/src/features/portfolio/model/portfolio-context";

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export function SidebarPortfolioCard() {
  const { portfolio } = usePortfolio();
  const snapshot = buildPortfolioSnapshot(portfolio, []);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Портфель</SidebarGroupLabel>
      <SidebarGroupContent>
        <Card className="bg-sidebar-accent/30 gap-3 border py-3">
          <CardHeader className="gap-1">
            <CardDescription>Текущий счет</CardDescription>
            <CardTitle className="text-lg font-semibold">
              {rubFormatter.format(snapshot.totalValue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground grid gap-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span>Свободные деньги</span>
              <span className="text-foreground font-medium">
                {rubFormatter.format(snapshot.cashBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Позиций</span>
              <span className="text-foreground font-medium">
                {snapshot.positionsCount}
              </span>
            </div>
          </CardContent>
          <CardFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full"
              render={<Link href="/portfolio" />}
            >
              <RiArrowRightUpLine />
              Перейти
            </Button>
            <DepositFundsSheet
              triggerLabel="Пополнить"
              triggerClassName="w-full"
            />
          </CardFooter>
        </Card>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
