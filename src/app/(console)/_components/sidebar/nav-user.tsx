"use client";

import { CircleUser, EllipsisVertical, LogOut, ShieldCheck, User } from "lucide-react";

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
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { signOutAction } from "@/lib/actions/auth";

export function NavUser({
  user,
}: {
  readonly user: {
    readonly name: string;
    readonly email: string;
    readonly avatar?: string | null;
    readonly role?: string;
  };
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
            >
              <Avatar className="size-8 rounded-lg shrink-0 border border-border/60 bg-muted flex items-center justify-center">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                ) : null}
                <AvatarFallback className="rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                  <User className="size-4 text-foreground/80" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-muted-foreground text-xs">{user.email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
                <Avatar className="h-9 w-9 rounded-lg shrink-0 border border-border/60 bg-muted flex items-center justify-center">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <User className="size-4.5 text-foreground/80" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">{user.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{user.email}</span>
                  {user.role ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                        {user.role}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CircleUser className="size-4 mr-2" />
                Profil Petugas
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ShieldCheck className="size-4 mr-2" />
                Hak Akses: {user.role || "Operator"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <form action={signOutAction} className="w-full">
              <DropdownMenuItem asChild className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                <button type="submit" className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm">
                  <LogOut className="size-4" />
                  <span>Keluar Akun</span>
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
