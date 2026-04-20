"use client";

import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  RiBankCardLine,
  RiLogoutBoxLine,
  RiMore2Line,
} from "@remixicon/react";
import {
  PASSCODE_STORAGE_KEY,
  PASSCODE_SETUP_PENDING_SESSION_KEY,
  PASSCODE_UNLOCKED_SESSION_KEY,
  PASSCODE_SKIP_ONCE_SESSION_KEY,
} from "@/src/features/passcode/model/storage";
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
  const { isMobile } = useSidebar();
  const initials = getUserInitials(user.login);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.localStorage.removeItem(PASSCODE_STORAGE_KEY);
    window.sessionStorage.removeItem(PASSCODE_SKIP_ONCE_SESSION_KEY);
    window.sessionStorage.removeItem(PASSCODE_SETUP_PENDING_SESSION_KEY);
    window.sessionStorage.removeItem(PASSCODE_UNLOCKED_SESSION_KEY);
    router.push("/login");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg grayscale">
              <AvatarImage src="" alt={user.login} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.login}</span>
              <span className="text-primary truncate text-xs font-medium">
                {user.statusLabel}
              </span>
            </div>
            <RiMore2Line className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src="" alt={user.login} />
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.login}</span>
                    <span className="text-primary truncate text-xs font-medium">
                      {user.statusLabel}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <RiBankCardLine />
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="hover:text-destructive data-highlighted:text-destructive focus:text-destructive [&_svg]:text-destructive data-highlighted:[&_svg]:text-destructive focus:[&_svg]:text-destructive"
              onClick={handleLogout}
            >
              <RiLogoutBoxLine />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
