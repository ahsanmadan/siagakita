"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  Map,
  RadioTower,
  RefreshCw,
  Siren,
  Settings,
  TentTree,
  TriangleAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useRealtimeStatus } from "@/components/realtime-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

const navigation = [
  { label: "Pusat Kendali", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kejadian", href: "/kejadian", icon: RadioTower },
  { label: "Posko & Kebutuhan", href: "/posko", icon: TentTree },
  { label: "Logistik", href: "/logistik", icon: Boxes },
  { label: "Laporan", href: "/laporan", icon: ClipboardList },
  { label: "Audit Log", href: "/audit-log", icon: FileClock },
  { label: "Peta Publik", href: "/peta-publik", icon: Map },
];

const realtimeStatusCopy = {
  connecting: { label: "Menyambungkan", detail: "Menyambungkan pembaruan data operasional.", tone: "bg-status-warning" },
  live: { label: "Live", detail: "Perubahan data akan masuk otomatis saat ada pembaruan.", tone: "bg-status-safe" },
  disconnected: { label: "Terputus", detail: "Pembaruan otomatis tidak aktif. Muat ulang halaman untuk data terbaru.", tone: "bg-muted-foreground" },
  error: { label: "Bermasalah", detail: "Pembaruan otomatis bermasalah. Aksi utama tetap berjalan lewat server.", tone: "bg-status-critical" },
};

export function AppShell({
  children,
  profileName,
  profileRole,
  activeEvents,
  signOutAction,
}: {
  children: ReactNode;
  profileName: string;
  profileRole: string;
  activeEvents: number;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const realtime = useRealtimeStatus();
  const realtimeCopy = realtimeStatusCopy[realtime.status];
  const lastUpdateTime = realtime.lastUpdateAt
    ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" }).format(realtime.lastUpdateAt)
    : null;
  const initials = profileName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon" className="border-r-0">
        <SidebarHeader className="px-3 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-3">
          <Link href="/dashboard" aria-label="SiagaKita - Pusat Kendali" className="inline-flex min-h-10 items-center">
            <BrandMark compact className="group-data-[collapsible=icon]:hidden" />
            <span className="siagakita-rail-brand hidden group-data-[collapsible=icon]:grid">
              <Siren className="size-4.5" aria-hidden="true" />
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-4">
          <SidebarGroup className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-1">
            <SidebarGroupLabel>Operasional</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2.5">
                {navigation.map((item) => {
                  const active = pathname === item.href || (item.href.startsWith("/kejadian") && pathname.startsWith("/kejadian"));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label} size="lg" className="siagakita-rail-button">
                        <Link href={item.href}>
                          <item.icon aria-hidden="true" />
                          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-4">
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="size-2 rounded-full bg-status-safe" />
              Sistem aktif
            </div>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Data tersimpan dan setiap aksi penting tercatat.</p>
          </div>
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Pengaturan" className="siagakita-rail-button">
                <Settings />
                <span className="group-data-[collapsible=icon]:hidden">Pengaturan</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-clip">
        <div className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/88 px-4 shadow-[0_1px_0_rgb(255_255_255/0.7)] backdrop-blur-xl md:px-6">
          <SidebarTrigger className="size-10" />
          <div className="hidden h-6 w-px bg-border sm:block" />
          <Badge variant="outline" className="hidden gap-2 rounded-full border-status-critical/20 bg-status-critical/8 sm:flex">
            <span className="size-2 rounded-full bg-status-critical" />
            {activeEvents} kejadian aktif
          </Badge>
          <Badge variant="outline" className="hidden gap-2 rounded-full bg-card sm:flex">
            <span className={cn("size-2 rounded-full", realtimeCopy.tone)} />
            Pembaruan {realtimeCopy.label}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-h-11 max-w-[12rem] justify-between bg-card px-3">
                  <Building2 />
                  <span className="hidden truncate sm:inline">Peran: {profileRole}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block">{profileName}</span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">{profileRole}</span>
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <form action={signOutAction}>
                    <button type="submit" className="w-full text-left">Keluar</button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative size-11" aria-label="Pembaruan data" onClick={realtime.resetUpdates}>
                  <Bell />
                  {realtime.pendingUpdates > 0 || realtime.status === "error" ? (
                    <span className={cn("absolute right-2 top-2 size-2 rounded-full", realtime.status === "error" ? "bg-status-critical" : "bg-status-safe")} />
                  ) : null}
                </Button>
                  </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Pembaruan data</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
                <PopoverHeader>
                  <PopoverTitle>Pembaruan data</PopoverTitle>
                  <PopoverDescription>Status pembaruan otomatis untuk data operasional.</PopoverDescription>
                </PopoverHeader>
                <div className="mt-4 grid gap-2">
                  <div className={cn("flex gap-3 rounded-lg border p-3", realtime.status === "error" ? "border-status-critical/20 bg-status-critical/8" : "bg-muted/60")}>
                    {realtime.status === "live" ? <Wifi className="mt-0.5 size-4 shrink-0 text-[var(--color-teal)]" /> : realtime.status === "error" || realtime.status === "disconnected" ? <WifiOff className="mt-0.5 size-4 shrink-0 text-[var(--color-critical-deep)]" /> : <RefreshCw className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />}
                    <div>
                      <p className="text-sm font-medium">Pembaruan {realtimeCopy.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{realtimeCopy.detail}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{realtime.pendingUpdates} pembaruan sejak panel dibuka</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lastUpdateTime ? `${realtime.lastUpdateLabel} · ${lastUpdateTime} WIB` : realtime.lastUpdateLabel}
                    </p>
                  </div>
                  <div className="flex gap-3 rounded-lg border border-status-critical/20 bg-status-critical/8 p-3">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-critical-deep)]" />
                    <div><p className="text-sm font-medium">{activeEvents} kejadian aktif perlu dipantau</p><p className="mt-1 text-xs text-muted-foreground">Buka detail kejadian untuk melihat kebutuhan, posko, dan distribusi terkait.</p></div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Avatar className="size-10 border">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials || "SK"}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <main className="min-w-0 flex-1 p-4 md:p-6 xl:p-8 2xl:px-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
