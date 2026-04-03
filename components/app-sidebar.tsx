"use client";

import * as React from "react";
import Link from "next/link";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { SidebarPortfolioCard } from "@/components/portfolio/sidebar-portfolio-card";
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
  RiCommandLine,
  RiFundsLine,
  RiTimeLine,
  RiWallet3Line,
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
      url: "/",
      matchUrl: "/",
      icon: <RiFundsLine />,
    },
    {
      title: "История",
      url: "/history",
      matchUrl: "/history",
      icon: <RiTimeLine />,
    },
    {
      title: "Портфель",
      url: "/portfolio",
      matchUrl: "/portfolio",
      icon: <RiWallet3Line />,
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
        <SidebarPortfolioCard />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
