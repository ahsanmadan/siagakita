"use client";

import { Bell, RefreshCw, TriangleAlert, Wifi, WifiOff } from "lucide-react";
import { useRealtimeStatus } from "@/components/realtime-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const realtimeStatusCopy = {
  connecting: { label: "Menyambungkan", detail: "Menyambungkan pembaruan data operasional.", tone: "bg-status-warning" },
  live: { label: "Live", detail: "Perubahan data akan masuk otomatis saat ada pembaruan.", tone: "bg-status-safe" },
  disconnected: { label: "Terputus", detail: "Pembaruan otomatis tidak aktif. Muat ulang halaman untuk data terbaru.", tone: "bg-muted-foreground" },
  error: { label: "Bermasalah", detail: "Pembaruan otomatis bermasalah. Aksi utama tetap berjalan lewat server.", tone: "bg-status-critical" },
};

export function RealtimeMenu({ activeEvents, profileRole }: { activeEvents: number; profileRole: string }) {
  const realtime = useRealtimeStatus();
  const copy = realtimeStatusCopy[realtime.status];
  const lastUpdateTime = realtime.lastUpdateAt
    ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" }).format(realtime.lastUpdateAt)
    : null;
  const hasAlert = realtime.pendingUpdates > 0 || realtime.status === "error";

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-8"
              aria-label="Status pembaruan data"
              onClick={realtime.resetUpdates}
            >
              <Bell />
              {hasAlert ? (
                <span
                  className={cn(
                    "absolute right-1.5 top-1.5 size-2 rounded-full",
                    realtime.status === "error" ? "bg-status-critical" : "bg-status-safe",
                  )}
                />
              ) : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Status pembaruan data</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <PopoverHeader>
          <PopoverTitle>Status operasional</PopoverTitle>
          <PopoverDescription>Ringkasan pembaruan data dan konteks peran aktif.</PopoverDescription>
        </PopoverHeader>
        <div className="mt-4 grid gap-2">
          <div
            className={cn(
              "flex gap-3 rounded-lg border p-3",
              realtime.status === "error" ? "border-status-critical/20 bg-status-critical/8" : "bg-muted/60",
            )}
          >
            {realtime.status === "live" ? (
              <Wifi className="mt-0.5 size-4 shrink-0 text-[var(--color-teal)]" />
            ) : realtime.status === "error" || realtime.status === "disconnected" ? (
              <WifiOff className="mt-0.5 size-4 shrink-0 text-[var(--color-critical-deep)]" />
            ) : (
              <RefreshCw className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
            )}
            <div>
              <p className="text-sm font-medium">Pembaruan {copy.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.detail}</p>
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
            <div>
              <p className="text-sm font-medium">{activeEvents} kejadian aktif perlu dipantau</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Buka detail kejadian untuk melihat kebutuhan, posko, dan distribusi terkait.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Peran aktif</p>
            <Badge variant="secondary" className="rounded-full px-2.5 text-xs font-semibold">
              {profileRole}
            </Badge>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
