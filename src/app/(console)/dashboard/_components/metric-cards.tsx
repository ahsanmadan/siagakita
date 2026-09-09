import Link from "next/link";
import { AlertTriangle, Boxes, FileSpreadsheet, Home, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Link href="/kejadian" className="group block focus:outline-none">
        <Card className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-primary/40">
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <AlertTriangle className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="transition-colors group-hover:text-foreground">Kejadian Bencana Aktif</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {activeEventsCount}
              </div>
              {activeEventsCount > 0 ? (
                <Badge variant="destructive">
                  <TrendingUp className="size-3" />
                  Aktif
                </Badge>
              ) : (
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                  Terkendali
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {eventsDetail ?? (activeEventsCount > 0 ? `${activeEventsCount} kejadian aktif` : "Seluruh wilayah aman")}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/posko" className="group block focus:outline-none">
        <Card className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-primary/40">
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Home className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="transition-colors group-hover:text-foreground">Total Jiwa di Posko</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {totalRefugeesCount.toLocaleString("id-ID")}
              </div>
              {totalRefugeesCount > 0 ? (
                <Badge variant="secondary">
                  <Home className="size-3" />
                  Posko
                </Badge>
              ) : (
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                  Nir-Pengungsi
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{totalSheltersCount} posko terverifikasi</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/logistik" className="group block focus:outline-none">
        <Card className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-primary/40">
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Boxes className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="transition-colors group-hover:text-foreground">Stok Bantuan Kritis</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {criticalSuppliesCount}
              </div>
              {criticalSuppliesCount > 0 ? (
                <Badge variant="destructive">
                  <TrendingUp className="size-3" />
                  Kritis
                </Badge>
              ) : (
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                  Aman
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {suppliesDetail ?? (criticalSuppliesCount > 0 ? "Perlu restock segera" : "Stok kebutuhan terpenuhi")}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/laporan" className="group block focus:outline-none">
        <Card className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-primary/40">
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <FileSpreadsheet className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="transition-colors group-hover:text-foreground">Antrean Verifikasi Laporan</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {unverifiedReportsCount}
              </div>
              {unverifiedReportsCount > 0 ? (
                <Badge variant="destructive">
                  <TrendingUp className="size-3" />
                  Menunggu
                </Badge>
              ) : (
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                  Tuntas
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {unverifiedReportsCount > 0 ? "SMS Zero-Grid & Form Web" : "Semua laporan terverifikasi"}
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
