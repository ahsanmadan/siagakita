import { RadioTower, TentTree, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getOperationsData } from "@/lib/repositories/operations";
import { EventsTable } from "./_components/events-table";

export default async function EventsPage() {
  await requireRole(["admin", "bpbd_operator", "field_officer"], "/dashboard");
  const { disasterEvents, metrics } = await getOperationsData();

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* ── 1. Top Header ── */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Ruang Operasi Kejadian Bencana Aktif
        </h1>
        <p className="font-sans text-sm text-muted-foreground mt-0.5">
          Pusat komando terpadu untuk koordinasi tim gabungan, eskalasi wilayah, dan alokasi sumber daya.
        </p>
      </div>

      {/* ── 2. Summary Metric Cards ── */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs md:grid-cols-3 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50">
                <RadioTower className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="font-sans text-xs font-medium text-muted-foreground">
              Kejadian Tanggap Darurat
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-heading font-semibold text-3xl tabular-nums leading-none tracking-tight">
              {metrics.activeEvents} Wilayah
            </div>
            <p className="font-sans text-muted-foreground text-xs">Sedang dalam proses penanganan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50">
                <Users className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="font-sans text-xs font-medium text-muted-foreground">
              Total Warga Terdampak
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-heading font-semibold text-3xl tabular-nums leading-none tracking-tight">
              {metrics.affectedPeople.toLocaleString("id-ID")} Jiwa
            </div>
            <p className="font-sans text-muted-foreground text-xs">Akumulasi seluruh titik bencana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50">
                <TentTree className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="font-sans text-xs font-medium text-muted-foreground">
              Posko Penampungan Terhubung
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-heading font-semibold text-3xl tabular-nums leading-none tracking-tight">
              {metrics.activeShelters} Posko
            </div>
            <p className="font-sans text-muted-foreground text-xs">Menerima pengungsi &amp; logistik</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Incident List Table Card ── */}
      <Card className="shadow-xs overflow-hidden border border-border/70">
        <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-border/60">
          <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
            Daftar Kejadian Bencana
          </CardTitle>
          <CardDescription className="font-sans text-xs text-muted-foreground mt-0.5">
            Pilih kejadian untuk membuka ruang kendali insiden, peta interaktif, dan koordinasi instansi.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <EventsTable events={disasterEvents} />
        </CardContent>
      </Card>
    </div>
  );
}
