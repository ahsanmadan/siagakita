"use client";

import Link from "next/link";
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
              className="h-12 rounded-lg px-2.5 transition-colors data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
            >
              <Avatar className="size-8 shrink-0 rounded-lg border border-border/60 bg-muted flex items-center justify-center">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                ) : null}
                <AvatarFallback className="rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                  <User className="size-4 text-foreground/80" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-xs text-foreground">{user.name}</span>
                <span className="truncate text-muted-foreground text-[11px] font-sans">{user.email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[280px] rounded-xl p-1.5 shadow-lg border border-border/80 bg-popover font-sans"
            side={isMobile ? "bottom" : "top"}
            align="start"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-2.5 py-2.5 text-left">
                <Avatar className="size-9 shrink-0 rounded-lg border border-border/60 bg-muted flex items-center justify-center">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <User className="size-4.5 text-foreground/80" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight min-w-0">
                  <span className="truncate font-display font-semibold text-xs text-foreground">
                    {user.name}
                  </span>
                  <span className="truncate text-muted-foreground text-[11px] font-sans mt-0.5">
                    {user.email}
                  </span>
                  {user.role && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 border border-border/60 font-sans">
                        {user.role}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer text-xs font-sans py-2 px-2.5 rounded-lg">
                <Link href="/akun" className="flex items-center gap-2.5 w-full">
                  <CircleUser className="size-4 text-muted-foreground shrink-0" />
                  <span>Profil Petugas</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer text-xs font-sans py-2 px-2.5 rounded-lg">
                <Link href="/akun" className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
                    <span>Hak Akses</span>
                  </div>
                  {user.role && (
                    <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                      {user.role}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1" />
            <form action={signOutAction} className="w-full">
              <DropdownMenuItem
                asChild
                className="cursor-pointer text-xs font-sans py-2 px-2.5 rounded-lg text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-500/10"
              >
                <button type="submit" className="flex w-full items-center gap-2.5 text-left">
                  <LogOut className="size-4 text-red-600/80 dark:text-red-400/80 shrink-0" />
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
