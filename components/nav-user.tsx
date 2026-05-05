"use client";

import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { RiLogoutBoxLine } from "@remixicon/react";
import { getUserInitials } from "@/src/lib/user";

export function NavUser({
  user,
}: {
  user: {
    login: string;
    statusLabel: string;
  };
}) {
  const router = useRouter();
  const initials = getUserInitials(user.login);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="border-sidebar-border/80 bg-sidebar-accent/35 flex min-w-0 items-center gap-2 rounded-lg border p-2">
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src="" alt={user.login} />
            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.login}</span>
            <span className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
              <span className="bg-chart-2 size-1.5 rounded-full" />
              {user.statusLabel}
            </span>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Выйти"
            title="Выйти"
            onClick={handleLogout}
          >
            <RiLogoutBoxLine />
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
