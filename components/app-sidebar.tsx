"use client";

import * as React from "react";
import Link from "next/link";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  RiBarChartBoxLine,
  RiCommandLine,
  RiFundsLine,
  RiLineChartLine,
  RiSearchLine,
} from "@remixicon/react";

const data = {
  user: {
    name: "MOEX Stream",
    email: "market@exchange.local",
    avatar: "",
  },
  navMain: [
    {
      title: "Обзор рынка",
      url: "#market-overview",
      icon: <RiFundsLine />,
    },
    {
      title: "Динамика цен",
      url: "#market-chart",
      icon: <RiLineChartLine />,
    },
    {
      title: "Биржевой список",
      url: "#stocks-table",
      icon: <RiBarChartBoxLine />,
    },
  ],
  navSecondary: [
    {
      title: "Поиск тикеров",
      url: "#stocks-table",
      icon: <RiSearchLine />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <RiCommandLine className="size-5!" />
              <span className="text-base font-semibold">Xchange Copilot</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
