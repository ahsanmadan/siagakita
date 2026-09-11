import Link from "next/link";
import { AlertTriangle, Boxes, FileSpreadsheet, Home } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MetricCardsProps {
  activeEventsCount?: number;
  eventsDetail?: string;
  totalSheltersCount?: number;
  totalRefugeesCount?: number;
  criticalSuppliesCount?: number;
  suppliesDetail?: string;
  unverifiedReportsCount?: number;
}

export function MetricCards({
  activeEventsCount = 0,
  eventsDetail,
  totalSheltersCount = 0,
  totalRefugeesCount = 0,
  criticalSuppliesCount = 0,
  suppliesDetail,
  unverifiedReportsCount = 0,
}: MetricCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Link
        href="/kejadian"
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Card className="h-full border-destructive/35 bg-destructive/[0.03] py-5 shadow-none transition-colors group-hover:border-destructive/60">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle className="font-display text-sm leading-tight">
                Kejadian Bencana Aktif
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Status kejadian terverifikasi
              </CardDescription>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="font-kpi text-3xl font-bold leading-none tabular-nums tracking-tight">
                {activeEventsCount}
              </div>
              {activeEventsCount === 0 && (
                <Badge
                  variant="outline"
                  className="h-6 rounded-md border-emerald-500/40 px-2 text-[11px] text-emerald-700 dark:text-emerald-400"
                >
                  Terkendali
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {eventsDetail ??
                (activeEventsCount > 0
                  ? `${activeEventsCount} kejadian aktif`
                  : "Seluruh wilayah aman")}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link
        href="/posko"
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Card className="h-full py-5 shadow-none transition-colors group-hover:border-primary/35">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle className="font-display text-sm leading-tight">
                Total Jiwa di Posko
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Populasi pengungsian tercatat
              </CardDescription>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <Home className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="font-kpi font-medium text-3xl tabular-nums leading-none tracking-tight">
                {totalRefugeesCount.toLocaleString("id-ID")}
              </div>
              {totalRefugeesCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-6 rounded-md px-2 text-[11px]"
                >
                  Terdata
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="h-6 rounded-md border-emerald-500/40 px-2 text-[11px] text-emerald-700 dark:text-emerald-400"
                >
                  Nir-pengungsi
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {totalSheltersCount} posko terverifikasi
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link
        href="/logistik"
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Card
          className={
            criticalSuppliesCount > 0
              ? "h-full border-amber-500/40 bg-amber-500/[0.04] py-5 shadow-none transition-colors group-hover:border-amber-500/70"
              : "h-full py-5 shadow-none transition-colors group-hover:border-primary/35"
          }
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle className="font-display text-sm leading-tight">
                Stok Bantuan Kritis
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Jenis kebutuhan menipis
              </CardDescription>
            </div>
            <div
              className={
                criticalSuppliesCount > 0
                  ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"
              }
            >
              <Boxes className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="font-kpi text-3xl font-bold leading-none tabular-nums tracking-tight">
                {criticalSuppliesCount}
              </div>
              {criticalSuppliesCount > 0 ? (
                <Badge className="h-6 rounded-md bg-amber-600 px-2 text-[11px] text-white dark:bg-amber-500 dark:text-amber-950">
                  Restock segera
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="h-6 rounded-md border-emerald-500/40 bg-emerald-500/10 px-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                >
                  Terpenuhi
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {suppliesDetail ??
                (criticalSuppliesCount > 0
                  ? "Perlu restock segera"
                  : "Stok kebutuhan terpenuhi")}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link
        href="/laporan"
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Card className="h-full py-5 shadow-none transition-colors group-hover:border-primary/35">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle className="font-display text-sm leading-tight">
                Antrean Verifikasi Laporan
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Laporan belum diverifikasi
              </CardDescription>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileSpreadsheet className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="font-kpi font-medium text-3xl tabular-nums leading-none tracking-tight">
                {unverifiedReportsCount}
              </div>
              {unverifiedReportsCount > 0 ? (
                <Badge
                  variant="outline"
                  className="h-6 rounded-md border-amber-500/50 px-2 text-[11px] text-amber-700 dark:text-amber-400"
                >
                  Menunggu
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="h-6 rounded-md border-emerald-500/40 px-2 text-[11px] text-emerald-700 dark:text-emerald-400"
                >
                  Tuntas
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {unverifiedReportsCount > 0
                ? "SMS Zero-Grid & Form Web"
                : "Semua laporan terverifikasi"}
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
